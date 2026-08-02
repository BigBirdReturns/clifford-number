const key=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(key(v[k]))])):Array.isArray(v)?v.map(x=>JSON.parse(key(x))):v);
export function checkSchema(value,schema,scope='$',errors=[]){
 const fail=m=>errors.push(`${scope}: ${m}`);
 if(schema.oneOf){const n=schema.oneOf.filter(s=>checkSchema(value,s,scope,[]).length===0).length;if(n!==1)fail('oneOf mismatch');return errors;}
 if(Object.hasOwn(schema,'const')&&key(value)!==key(schema.const))fail('const changed');
 if(schema.enum&&!schema.enum.some(v=>key(v)===key(value)))fail('enum mismatch');
 const types=Array.isArray(schema.type)?schema.type:(schema.type?[schema.type]:[]);
 if(types.length){const matched=types.some(t=>t==='null'?value===null:t==='object'?value&&typeof value==='object'&&!Array.isArray(value):t==='array'?Array.isArray(value):t==='string'?typeof value==='string':t==='integer'?Number.isInteger(value):t==='boolean'?typeof value==='boolean':true);if(!matched){fail(`type mismatch ${types.join('|')}`);return errors;}}
 if(schema.type==='object'&&value&&typeof value==='object'&&!Array.isArray(value)){
  const props=schema.properties||{};for(const n of schema.required||[])if(!Object.hasOwn(value,n))errors.push(`${scope}: missing ${n}`);
  if(schema.additionalProperties===false)for(const n of Object.keys(value))if(!Object.hasOwn(props,n))errors.push(`${scope}: unexpected ${n}`);
  for(const [n,s] of Object.entries(props))if(Object.hasOwn(value,n))checkSchema(value[n],s,`${scope}.${n}`,errors);
 }
 if(schema.type==='array'&&Array.isArray(value)){
  if(schema.minItems!==undefined&&value.length<schema.minItems)fail(`minItems ${schema.minItems}`);if(schema.maxItems!==undefined&&value.length>schema.maxItems)fail(`maxItems ${schema.maxItems}`);
  if(schema.uniqueItems&&new Set(value.map(key)).size!==value.length)fail('duplicate array item');if(schema.items)value.forEach((v,i)=>checkSchema(v,schema.items,`${scope}[${i}]`,errors));
 }
 if(schema.type==='string'&&typeof value==='string'){if(schema.minLength!==undefined&&value.length<schema.minLength)fail('minLength');if(schema.pattern&&!new RegExp(schema.pattern).test(value))fail(`pattern ${schema.pattern}`);}
 if(schema.type==='integer'&&Number.isInteger(value)){if(schema.minimum!==undefined&&value<schema.minimum)fail(`minimum ${schema.minimum}`);if(schema.maximum!==undefined&&value>schema.maximum)fail(`maximum ${schema.maximum}`);}
 return errors;
}
