#!/usr/bin/env python3
"""Regression and lock tests for the real acquisition query's additive index."""
from __future__ import annotations
import contextlib
import fcntl
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import ecology_task_priority as opt

SCHEMA="""CREATE TABLE tasks(id TEXT PRIMARY KEY,lane TEXT,kind TEXT,spec TEXT,estates TEXT,
 status TEXT DEFAULT 'ready',cursor INTEGER DEFAULT 1,pages INTEGER DEFAULT 0,
 rows_seen INTEGER DEFAULT 0,expected INTEGER,error TEXT,attempts INTEGER DEFAULT 0,
 updated TEXT,started TEXT)"""

class Priority(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.root=Path(self.tmp.name)
  self.db=self.root/'ecology.sqlite'
  self.lock=self.root/'acquisition.lock'
  self.lock.write_text('{}')
  self.receipt=self.root/'proof'/'ACCEPTED.json'
  c=sqlite3.connect(self.db)
  c.execute(SCHEMA)
  c.execute('CREATE INDEX task_ready ON tasks(lane,status,updated,id)')
  self.values=[
   ('oldest','sources','document',json.dumps({'date':'1991-01-02'}),'[]','ready',1,0,0,None,None,0,'1991-01-03',None),
   ('second','sources','document',json.dumps({'start':'1991-01-03'}),'[]','ready',1,0,0,None,None,0,'1991-01-03',None),
   ('recent','sources','document',json.dumps({'start':'2026-11-02'}),'[]','ready',1,0,0,None,None,0,'2026-11-03',None),
   ('advanced-page','sources','document',json.dumps({'start':'1991-01-01'}),'[]','partial',2,1,100,None,None,0,'1991-01-03',None),
   ('held','sources','document',json.dumps({'date':'1990-01-01'}),'[]','source_access_hold',1,0,0,None,None,0,'1991-01-03',None),
   ('award','awards','award',json.dumps({'start':'2007-10-01'}),'[]','ready',1,0,0,None,None,0,'2007-10-01',None),
  ]
  with c:c.executemany('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',self.values)
  c.close()
 def tearDown(self):self.tmp.cleanup()
 def test_exact_order_and_no_mutation(self):
  with sqlite3.connect(self.db) as c:
   before=list(c.execute('SELECT * FROM tasks ORDER BY id'))
   original=opt.sample(c,n=2)
  result=opt.apply(self.root,self.receipt)
  self.assertEqual(result['status'],'PASS')
  self.assertEqual(result['rows'],6)
  self.assertTrue(self.receipt.is_file())
  self.assertEqual(result['before']['sources']['next_id'],'oldest')
  self.assertEqual(result['after']['sources']['next_id'],'oldest')
  self.assertEqual(result['after']['awards']['next_id'],'award')
  self.assertEqual(result['after']['policy']['next_id'],None)
  self.assertTrue(any(opt.INDEX in x for x in result['after']['sources']['plan']))
  with sqlite3.connect(self.db) as c:self.assertEqual(list(c.execute('SELECT * FROM tasks ORDER BY id')),before)
  self.assertEqual(opt.apply(self.root,self.root/'UNUSED.json')['status'],'already_installed')
  self.assertFalse((self.root/'UNUSED.json').exists())
 def test_lock_contention_refuses_write(self):
  with self.lock.open('a+') as handle:
   fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
   try:
    with self.assertRaisesRegex(RuntimeError,'Existing acquisition owner'):
     opt.apply(self.root,self.receipt)
   finally:fcntl.flock(handle,fcntl.LOCK_UN)
  self.assertFalse(self.receipt.exists())
  with sqlite3.connect(self.db) as c:
   self.assertFalse(c.execute("SELECT 1 FROM sqlite_master WHERE name=?",(opt.INDEX,)).fetchone())
 def test_requires_existing_lock(self):
  self.lock.unlink()
  with self.assertRaisesRegex(ValueError,'Missing native acquisition'):
   opt.apply(self.root,self.receipt)
  self.assertFalse(self.receipt.exists())
 def test_verify_absent_index_refuses(self):
  with opt.connect(self.db,readonly=True) as c:
   with self.assertRaisesRegex(ValueError,'Priority index absent'):opt.verify(c)
  self.assertFalse(self.receipt.exists())

if __name__=='__main__':unittest.main()
