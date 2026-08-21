#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseUtc,validateStageStack} from '../tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPAIR_PATH=path.join(ROOT,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-postmerge-repair.json');
const VALIDATOR=path.join(ROOT,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.mjs');
const repair=JSON.parse(fs.readFileSync(REPAIR_PATH,'utf8'));
const validatorSource=fs.readFileSync(VALIDATOR,'utf8');
assert.ok(validatorSource.includes("ptBlob:'5be7e14be813accb0dcc8607e87ec9ececb9d0d3'"));
assert.ok(validatorSource.includes("pwBlob:'fd0c462e959b9285ed56f62c85c0c55aadb87b7f'"));
assert.ok(!validatorSource.includes("ptBlob:'022ed76bb4c0b32feb7d803d98998f689f4e9763'"));
assert.ok(!validatorSource.includes("pwBlob:'2a00256fffc14570f2c4abf3c5c0791313c1a51e'"));
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const blob=buffer=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const jsonBytes=value=>Buffer.from(`${JSON.stringify(value,null,2)}\n`,'utf8');
const formatUtcNanoseconds=value=>{
  const seconds=value/1_000_000_000n,fraction=value%1_000_000_000n;
  const base=new Date(Number(seconds*1_000n)).toISOString().slice(0,19);
  return `${base}.${fraction.toString().padStart(9,'0')}Z`;
};
const intervalAround=(timestamp,uncertaintyNanoseconds=1_000_000n)=>{
  const center=parseUtc(timestamp);
  return[formatUtcNanoseconds(center-uncertaintyNanoseconds),formatUtcNanoseconds(center+uncertaintyNanoseconds)];
};
const STAGES=['transaction','federal_cash_custody','public_account_booking','distribution'];
const HEX64='a'.repeat(64);

assert.equal(parseUtc('2026-08-27T00:00:00Z'),BigInt(Date.UTC(2026,7,27))*1_000_000n);
assert.ok(parseUtc('2026-08-27T00:00:00.000000001Z')<parseUtc('2026-08-27T00:00:00.000000002Z'));
for(const invalid of ['2026-13-01T00:00:00Z','2026-02-30T00:00:00Z','2026-08-27T24:00:00Z','not-a-time',null])assert.equal(parseUtc(invalid),null);

const contracts=()=>{
  const provenanceFields=[
    'receipt_id','event_chain_id','stage','predecessor_stage_receipt_id','source_authority',
    'authority_identifier_scheme','source_authority_identifier','source_record_identifier','source_record_class',
    'source_origin_body_sha256','source_custody_body_sha256','origin_evidence_sha256',
    'acquisition_receipt_sha256','source_body_custody','authority_resolution_receipt',
    'origin_evidence_receipt','acquisition_receipt','provenance_object_custody_complete','stage_admissible'
  ];
  const connectionFields=[
    'connection_authentication_receipt_id','connection_authentication_observed_at_utc',
    'dns_resolution_receipt_sha256','dns_resolution_custody_locator',
    'network_endpoint_receipt_sha256','network_endpoint_custody_locator',
    'proxy_chain_receipt_sha256','proxy_chain_custody_locator',
    'tls_peer_receipt_sha256','tls_peer_custody_locator',
    'application_protocol_receipt_sha256','application_protocol_custody_locator',
    'connection_reuse_state','redirect_hop_connection_receipts',
    'source_origin_authority_reconciliation','connection_authentication_receipt_sha256',
    'connection_authentication_custody_locator','repository_blob_sha_if_used'
  ];
  const observationFields=[
    'observation_time_receipt_id','observation_time_observed_at_utc','clock_source_class',
    'clock_source_identifier','clock_source_authority','clock_source_authority_identifier',
    'clock_source_receipt_sha256','clock_source_custody_locator','clock_source_repository_blob_sha_if_used',
    'synchronization_state','synchronization_observed_at_utc','synchronization_receipt_sha256',
    'synchronization_custody_locator','clock_resolution_seconds','clock_offset_seconds',
    'clock_uncertainty_seconds','clock_drift_bound_ppm','holdover_started_at_utc',
    'monotonic_clock_identifier','monotonic_sample_start','monotonic_sample_end',
    'wall_clock_start_utc','wall_clock_end_utc','wall_to_monotonic_mapping_sha256',
    'wall_to_monotonic_mapping_custody_locator','clock_adjustment_events','leap_second_state',
    'leap_smear_policy','time_receipt_sha256','time_receipt_custody_locator',
    'time_receipt_repository_blob_sha_if_used','freshness_policy_identifier',
    'freshness_policy_sha256','freshness_policy_custody_locator',
    'freshness_evaluation_observed_at_utc','freshness_result','temporal_order_reconciliation'
  ];
  const dnsFields=['query_name','query_type','query_class','resolver_identity','resolver_transport','response_rcode','cname_chain','answer_rrsets','dnssec_state','observed_at_utc','expires_at_utc','wire_response_sha256','wire_response_length_bytes','wire_response_custody_locator','canonical_response_sha256','canonical_response_custody_locator'];
  const endpointFields=['address_family','transport_protocol','remote_ip','remote_port','connection_started_at_utc','connection_established_at_utc','connection_closed_at_utc','socket_endpoint_observation_sha256','socket_endpoint_custody_locator'];
  const proxyFields=['proxy_mode','proxy_chain','target_authority','connect_or_tunnel_state','proxy_authentication_scope','proxy_chain_sha256','proxy_chain_custody_locator'];
  const tlsFields=['server_name_indication','alpn_offered','alpn_negotiated','tls_version','cipher_suite','key_exchange_group','session_resumption_state','peer_certificate_chain','leaf_certificate_der_sha256','leaf_spki_sha256','subject_alternative_names','hostname_verification_input','hostname_verification_result','trust_store_identifier','trust_store_sha256','validation_policy_identifier','certificate_chain_validation_result','certificate_not_before_utc','certificate_not_after_utc','revocation_evidence_state','certificate_transparency_evidence_state','tls_transcript_sha256','tls_transcript_custody_locator'];
  const certFields=['position','der_sha256','der_length_bytes','der_custody_locator','subject','issuer','serial_number','not_before_utc','not_after_utc'];
  const protocolFields=['negotiated_http_version','http1_host_header_if_used','http2_or_http3_pseudo_headers_if_used','pseudo_header_projection_sha256','request_envelope_reconciliation_result','connection_coalescing_state','authenticated_origin_set','connection_reuse_predecessor_receipt_id','application_protocol_receipt_sha256','application_protocol_custody_locator'];
  const timeFields=['schema_version','object_class','receipt_id','event_chain_id','stage','clock_source_class','clock_source_identifier','clock_source_authority','clock_source_authority_identifier','clock_source_receipt_binding','synchronization_state','synchronization_receipt_binding','clock_resolution_seconds','clock_offset_seconds','clock_uncertainty_seconds','clock_drift_bound_ppm','holdover_started_at_utc','monotonic_clock_identifier','monotonic_sample_start','monotonic_sample_end','wall_clock_start_utc','wall_clock_end_utc','wall_to_monotonic_mapping_binding','clock_adjustment_events','leap_second_state','leap_smear_policy','source_observation_bindings','freshness_policy_binding','freshness_evaluations','temporal_order_reconciliation','observed_at_utc'];
  return{
    policy:{schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-control-stack-amendment@1',status:'intel_realization_stage_receipt_control_stack_amendment_frozen'},
    liveContract:{
      schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-live-registry-contract@1',
      status:'intel_realization_stage_receipt_live_registry_contract_frozen',
      stage_order:STAGES,
      ordinary_gate_utc:'2026-08-27T00:00:00Z',
      policy_binding:{blob_sha:'c874948a3d3c0f17c4cb350b26bc12e17f29213e'},
      legacy_registry_baseline:{blob_sha:'e8ff7438814f79309964b75805d5f945bd0bcbd8'},
      live_registry:{schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-control-stack-registry@1'},
      registry_entry_contract:{required_fields:['registry_receipt_id','event_chain_id','stage','predecessor_registry_receipt_id','control_stack_receipt_id','registered_at_utc']},
      control_stack_receipt_contract:{
        schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-control-stack-receipt@1',
        object_class:'intel_realization_stage_control_stack_receipt',
        required_fields:['schema_version','object_class','control_stack_receipt_id','registry_receipt_id','event_chain_id','stage','provenance_stage_receipt_binding','connection_authentication_receipt_binding','observation_time_receipt_binding','temporal_reconciliation_receipt_binding','temporal_reconciliation_result','all_bindings_valid','full_control_stack_complete','stage_admissible','observed_at_utc'],
        binding_required_fields:['path','blob_sha','body_sha256','schema_version','receipt_id','event_chain_id','stage']
      },
      source_receipt_overlay_fields:{required_fields:['receipt_id','event_chain_id','stage','control_role','control_result']}
    },
    legacyRegistry:{schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1',receipts:[]},
    pc:{
      stage_receipt_required_fields:provenanceFields,
      source_identity_rules:{allowed_source_record_classes:['official_primary_record']},
      provenance_object_bindings:{
        authority_resolution_receipt:{
          schema_version:'m05-answerable-power-s03-l7-intel-authority-resolution-receipt@1',
          object_class:'source_authority_resolution_receipt',
          required_fields:['schema_version','object_class','source_authority','authority_identifier_scheme','source_authority_identifier','verification_method','official_origin_hosts','official_record_system_identifiers','evidence_items','observed_at_utc'],
          allowed_identifier_schemes:['us_federal_agency_domain_and_record_system'],
          allowed_verification_methods:['official_domain_and_record_system']
        },
        origin_evidence_receipt:{
          schema_version:'m05-answerable-power-s03-l7-intel-origin-evidence-receipt@1',
          object_class:'source_origin_evidence_receipt',
          required_fields:['schema_version','object_class','source_authority','authority_identifier_scheme','source_authority_identifier','source_record_identifier','source_record_class','source_origin_url','source_origin_observed_at_utc','source_origin_content_type','source_origin_body_sha256','origin_verification_mode','authority_resolution_receipt_body_sha256','origin_evidence_items'],
          allowed_origin_verification_modes:['official_https_retrieval_with_transport_receipt']
        },
        acquisition_receipt:{
          schema_version:'m05-answerable-power-s03-l7-intel-acquisition-receipt@1',
          object_class:'source_acquisition_receipt',
          required_fields:['schema_version','object_class','requested_url','resolved_url','redirect_chain','response_status','request_method','request_headers_custody','response_headers_custody','tls_peer_certificate_custody','request_contains_credentials','observed_at_utc','content_type','body_length_bytes','source_origin_body_sha256','acquisition_method','acquisition_tool','acquisition_tool_version','authority_resolution_receipt_body_sha256','origin_evidence_receipt_body_sha256'],
          allowed_request_methods:['GET'],
          allowed_acquisition_methods:['direct_official_retrieval'],
          request_headers_content_type:'application/http-request-headers',
          response_headers_content_type:'application/http-response-headers',
          tls_peer_certificate_content_type:'application/pem-certificate-chain'
        }
      }
    },
    cc:{
      effective_stage_connection_authentication:Object.fromEntries(STAGES.map(stage=>[stage,{required_fields:connectionFields}])),
      connection_authentication_rules:{
        allowed_connection_reuse_states:['new_connection'],
        dns_receipt_required_fields:dnsFields,
        allowed_resolver_transports:['dns_over_https'],
        allowed_dnssec_states:['validated'],
        network_endpoint_receipt_required_fields:endpointFields,
        allowed_transport_protocols:['tcp'],
        proxy_receipt_required_fields:proxyFields,
        allowed_proxy_modes:['direct'],
        tls_peer_receipt_required_fields:tlsFields,
        certificate_chain_entry_required_fields:certFields,
        application_protocol_receipt_required_fields:protocolFields,
        redirect_hop_required_fields:['hop_index','request_envelope_receipt_id','connection_authentication_receipt_id','requested_url','resolved_url','response_status','location','observed_at_utc']
      }
    },
    oc:{
      effective_stage_observation_time_custody:Object.fromEntries(STAGES.map(stage=>[stage,{required_fields:observationFields}])),
      time_receipt_contract:{
        schema_version:'m05-answerable-power-s03-l7-intel-observation-time-receipt@1',
        object_class:'trusted_observation_time_receipt',
        required_fields:timeFields,
        binding_required_fields:['path','blob_sha','body_sha256','content_type','schema_version'],
        allowed_clock_source_classes:['authenticated_nts_ntp_clock'],
        allowed_synchronization_states:['synchronized'],
        allowed_leap_second_states:['no_pending_leap','unknown'],
        allowed_leap_smear_policies:['none']
      },
      clock_source_profile_rules:{
        authenticated_nts_ntp_clock:{required_fields:['server_identity','nts_cookie_or_session_receipt_sha256','stratum','root_delay_seconds','root_dispersion_seconds','reference_identifier','reference_time_utc','offset_seconds','round_trip_delay_seconds','poll_interval_seconds','sample_set_sha256']}
      },
      monotonic_mapping_rules:{mapping_required_fields:['mapping_version','monotonic_clock_identifier','monotonic_sample_start','monotonic_sample_end','wall_clock_start_utc','wall_clock_end_utc','offset_seconds','uncertainty_seconds','mapping_body_sha256','mapping_custody_locator']},
      clock_adjustment_event_rules:{required_fields:['event_id','event_type','observed_at_utc','magnitude_seconds','pre_event_offset_seconds','post_event_offset_seconds','evidence_sha256','evidence_custody_locator'],allowed_event_types:['step_forward','step_backward','slew_started','slew_completed','leap_inserted','leap_deleted','smear_started','smear_completed','clock_source_changed','holdover_started','holdover_ended','monotonic_epoch_reset']},
      temporal_reconciliation_rules:{required_time_roles:['source_origin_observation','dns_observation','dns_expiry','connection_started','connection_established','tls_validation','certificate_validity_check','revocation_evidence_observation','certificate_transparency_evidence_observation','request_sent','response_headers_received','response_body_completed','connection_closed','freshness_evaluation']},
      freshness_policy_rules:{
        policy_required_fields:['policy_id','policy_version','time_role','maximum_age_seconds','reference_time_role','uncertainty_treatment','failure_action','policy_body_sha256','policy_custody_locator'],
        evaluation_required_fields:['policy_id','subject_receipt_id','reference_receipt_id','subject_interval','reference_interval','computed_age_lower_bound_seconds','computed_age_upper_bound_seconds','result','evaluated_at_utc','evaluation_body_sha256','evaluation_custody_locator']
      }
    },
    tc:{}
  };
};

const writeFixture=(options={})=>{
  const c=contracts();
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'m05-stage-stack-repair-'));
  const sourceDir=path.join(root,'receipts/m05/intel-realization/source');
  const stackDir=path.join(root,'receipts/m05/intel-realization/control-stack');
  fs.mkdirSync(sourceDir,{recursive:true});fs.mkdirSync(stackDir,{recursive:true});
  const event=options.eventChain??'event-1',stage=options.stage??'transaction';
  let counter=0;
  const writeRaw=(label,content=label)=>{
    counter+=1;
    const rel=`receipts/m05/intel-realization/source/${String(counter).padStart(2,'0')}-${label}.bin`;
    const abs=path.join(root,...rel.split('/'));fs.mkdirSync(path.dirname(abs),{recursive:true});
    const bytes=Buffer.isBuffer(content)?content:Buffer.from(String(content));
    fs.writeFileSync(abs,bytes);
    return{path:rel,blob_sha:blob(bytes),body_sha256:sha(bytes),content_type:'application/octet-stream',bytes};
  };
  const writeJson=(label,value)=>{
    counter+=1;
    const rel=`receipts/m05/intel-realization/source/${String(counter).padStart(2,'0')}-${label}.json`;
    const abs=path.join(root,...rel.split('/'));const bytes=jsonBytes(value);fs.writeFileSync(abs,bytes);
    return{path:rel,blob_sha:blob(bytes),body_sha256:sha(bytes),schema_version:value.schema_version,content_type:'application/json',bytes};
  };
  const overlay=(role,id)=>({schema_version:`fixture-${role}@1`,object_class:'fixture_stage_control_receipt',receipt_id:id,event_chain_id:event,stage,control_role:role,control_result:'pass'});

  const sourceBody=writeRaw('source-body','official body');
  const authorityEvidence=writeRaw('authority-evidence','authority evidence');
  const authorityValue={
    schema_version:c.pc.provenance_object_bindings.authority_resolution_receipt.schema_version,
    object_class:c.pc.provenance_object_bindings.authority_resolution_receipt.object_class,
    source_authority:'US Department of Commerce',
    authority_identifier_scheme:'us_federal_agency_domain_and_record_system',
    source_authority_identifier:'commerce.gov',
    verification_method:'official_domain_and_record_system',
    official_origin_hosts:['www.commerce.gov'],
    official_record_system_identifiers:['commerce-record-1'],
    evidence_items:[{evidence_role:'official_origin',source_url:'https://www.commerce.gov/record',source_locator:'record',body_binding:authorityEvidence}],
    observed_at_utc:'2026-08-27T00:00:01Z'
  };
  const authority=writeJson('authority',authorityValue);
  const originEvidenceBody=writeRaw('origin-evidence-body','origin evidence');
  const originValue={
    schema_version:c.pc.provenance_object_bindings.origin_evidence_receipt.schema_version,
    object_class:c.pc.provenance_object_bindings.origin_evidence_receipt.object_class,
    source_authority:'US Department of Commerce',
    authority_identifier_scheme:'us_federal_agency_domain_and_record_system',
    source_authority_identifier:'commerce.gov',
    source_record_identifier:'record-1',
    source_record_class:'official_primary_record',
    source_origin_url:'https://www.commerce.gov/record',
    source_origin_observed_at_utc:'2026-08-27T00:00:02Z',
    source_origin_content_type:'application/json',
    source_origin_body_sha256:sourceBody.body_sha256,
    origin_verification_mode:'official_https_retrieval_with_transport_receipt',
    authority_resolution_receipt_body_sha256:authority.body_sha256,
    origin_evidence_items:[{evidence_role:'origin',source_url:'https://www.commerce.gov/record',source_locator:'record',body_binding:originEvidenceBody}]
  };
  const origin=writeJson('origin',originValue);
  const reqHeaders=writeRaw('request-headers','GET /record');
  reqHeaders.content_type='application/http-request-headers';
  const resHeaders=writeRaw('response-headers','HTTP/1.1 200');
  resHeaders.content_type='application/http-response-headers';
  const certs=writeRaw('acquisition-certs','CERT');
  certs.content_type='application/pem-certificate-chain';
  const acquisitionValue={
    schema_version:c.pc.provenance_object_bindings.acquisition_receipt.schema_version,
    object_class:c.pc.provenance_object_bindings.acquisition_receipt.object_class,
    requested_url:'https://www.commerce.gov/record',resolved_url:'https://www.commerce.gov/record',
    redirect_chain:options.invalidAcquisitionRedirect?[null]:[],response_status:200,request_method:'GET',
    request_headers_custody:reqHeaders,response_headers_custody:resHeaders,tls_peer_certificate_custody:certs,
    request_contains_credentials:false,observed_at_utc:'2026-08-27T00:00:03Z',
    content_type:sourceBody.content_type,body_length_bytes:options.acquisitionLengthMismatch?sourceBody.bytes.length+1:sourceBody.bytes.length,
    source_origin_body_sha256:sourceBody.body_sha256,acquisition_method:'direct_official_retrieval',
    acquisition_tool:'fixture',acquisition_tool_version:'1',
    authority_resolution_receipt_body_sha256:authority.body_sha256,
    origin_evidence_receipt_body_sha256:origin.body_sha256
  };
  const acquisition=writeJson('acquisition',acquisitionValue);
  const provenanceValue={
    ...overlay('provenance_object_custody',options.provenanceId??'prov-1'),
    predecessor_stage_receipt_id:options.provenancePredecessorNonNull?'wrong-predecessor':null,source_authority:'US Department of Commerce',
    authority_identifier_scheme:'us_federal_agency_domain_and_record_system',
    source_authority_identifier:'commerce.gov',source_record_identifier:'record-1',
    source_record_class:'official_primary_record',source_origin_body_sha256:sourceBody.body_sha256,
    source_custody_body_sha256:sourceBody.body_sha256,origin_evidence_sha256:origin.body_sha256,
    acquisition_receipt_sha256:acquisition.body_sha256,source_body_custody:sourceBody,
    authority_resolution_receipt:{path:authority.path,blob_sha:authority.blob_sha,body_sha256:authority.body_sha256,schema_version:authority.schema_version},
    origin_evidence_receipt:{path:origin.path,blob_sha:origin.blob_sha,body_sha256:origin.body_sha256,schema_version:origin.schema_version},
    acquisition_receipt:{path:acquisition.path,blob_sha:acquisition.blob_sha,body_sha256:acquisition.body_sha256,schema_version:acquisition.schema_version},
    provenance_object_custody_complete:true,stage_admissible:true
  };
  const provenance=writeJson('provenance',provenanceValue);

  const dnsWire=writeRaw('dns-wire','wire');
  const dnsCanonical=writeRaw('dns-canonical','canonical');
  const dnsValue={query_name:options.nullNestedDns?null:'www.commerce.gov.',query_type:'A',query_class:'IN',resolver_identity:'resolver',resolver_transport:'dns_over_https',response_rcode:'NOERROR',cname_chain:[],answer_rrsets:options.nullDnsAnswer?[null]:[{address:'192.0.2.1'}],dnssec_state:'validated',observed_at_utc:'2026-08-27T00:00:01Z',expires_at_utc:'2026-08-27T00:10:01Z',wire_response_sha256:dnsWire.body_sha256,wire_response_length_bytes:4,wire_response_custody_locator:dnsWire.path,canonical_response_sha256:options.sameRoleNestedReuse?dnsWire.body_sha256:dnsCanonical.body_sha256,canonical_response_custody_locator:options.sameRoleNestedReuse?dnsWire.path:dnsCanonical.path};
  const dns=writeJson('dns',dnsValue);
  const socket=writeRaw('socket','socket');
  const endpoint=writeJson('endpoint',{address_family:'IPv4',transport_protocol:'tcp',remote_ip:'192.0.2.1',remote_port:443,connection_started_at_utc:'2026-08-27T00:00:01Z',connection_established_at_utc:'2026-08-27T00:00:02Z',connection_closed_at_utc:'2026-08-27T00:00:05Z',socket_endpoint_observation_sha256:socket.body_sha256,socket_endpoint_custody_locator:socket.path});
  const proxyEvidence=writeRaw('proxy-evidence','proxy');
  const proxy=writeJson('proxy',{proxy_mode:options.nullProxyEntry?'http_connect_tunnel':'direct',proxy_chain:options.nullProxyEntry?[null]:[],target_authority:'www.commerce.gov:443',connect_or_tunnel_state:options.nullProxyEntry?'tunnel_established':'direct',proxy_authentication_scope:options.nullProxyEntry?'proxy_only':'none',proxy_chain_sha256:proxyEvidence.body_sha256,proxy_chain_custody_locator:proxyEvidence.path});
  const der=writeRaw('cert-der','DER');
  const transcript=writeRaw('tls-transcript','transcript');
  const tls=writeJson('tls',{
    server_name_indication:'www.commerce.gov',alpn_offered:['h2'],alpn_negotiated:'h2',tls_version:'TLSv1.3',cipher_suite:'TLS_AES_128_GCM_SHA256',key_exchange_group:'x25519',session_resumption_state:'new',
    peer_certificate_chain:[{position:0,der_sha256:der.body_sha256,der_length_bytes:3,der_custody_locator:der.path,subject:'CN=www.commerce.gov',issuer:'CN=Test CA',serial_number:'01',not_before_utc:'2026-01-01T00:00:00Z',not_after_utc:'2027-01-01T00:00:00Z'}],
    leaf_certificate_der_sha256:options.tlsLeafMismatch?HEX64:der.body_sha256,leaf_spki_sha256:HEX64,subject_alternative_names:['www.commerce.gov'],hostname_verification_input:'www.commerce.gov',hostname_verification_result:'pass',
    trust_store_identifier:'test-store',trust_store_sha256:HEX64,validation_policy_identifier:'webpki',certificate_chain_validation_result:'pass',
    certificate_not_before_utc:'2026-01-01T00:00:00Z',certificate_not_after_utc:'2027-01-01T00:00:00Z',revocation_evidence_state:options.tlsEvidenceFail?'revoked':'good',certificate_transparency_evidence_state:'included',
    tls_transcript_sha256:transcript.body_sha256,tls_transcript_custody_locator:transcript.path
  });
  const protocolEvidence=writeRaw('protocol-evidence','application protocol evidence');
  const protocol=writeJson('protocol',{negotiated_http_version:'h2',http1_host_header_if_used:null,http2_or_http3_pseudo_headers_if_used:{':method':'GET',':scheme':'https',':authority':options.applicationAuthorityMismatch?'evil.example':'www.commerce.gov',':path':'/record'},pseudo_header_projection_sha256:HEX64,request_envelope_reconciliation_result:'pass',connection_coalescing_state:'new_connection',authenticated_origin_set:['https://www.commerce.gov'],connection_reuse_predecessor_receipt_id:null,application_protocol_receipt_sha256:protocolEvidence.body_sha256,application_protocol_custody_locator:options.missingProtocolEvidence?'receipts/m05/intel-realization/source/missing-protocol-evidence.bin':protocolEvidence.path});
  const connectionSummary=writeRaw('connection-summary','connection summary');
  const connectionValue={
    ...overlay('connection_authentication',options.connectionId??'conn-1'),
    connection_authentication_receipt_id:options.connectionId??'conn-1',
    connection_authentication_observed_at_utc:'2026-08-27T00:00:04Z',
    dns_resolution_receipt_sha256:dns.body_sha256,dns_resolution_custody_locator:dns.path,
    network_endpoint_receipt_sha256:endpoint.body_sha256,network_endpoint_custody_locator:endpoint.path,
    proxy_chain_receipt_sha256:proxy.body_sha256,proxy_chain_custody_locator:proxy.path,
    tls_peer_receipt_sha256:tls.body_sha256,tls_peer_custody_locator:tls.path,
    application_protocol_receipt_sha256:protocol.body_sha256,application_protocol_custody_locator:protocol.path,
    connection_reuse_state:'new_connection',redirect_hop_connection_receipts:[],
    source_origin_authority_reconciliation:{result:'pass'},
    connection_authentication_receipt_sha256:connectionSummary.body_sha256,
    connection_authentication_custody_locator:connectionSummary.path,repository_blob_sha_if_used:null,
    connection_authentication_complete:true
  };
  if(options.nullConnection)connectionValue.dns_resolution_receipt_sha256=null;
  const connection=writeJson('connection',connectionValue);

  const clockValue={server_identity:options.nullClockProfile?null:'time.example',nts_cookie_or_session_receipt_sha256:HEX64,stratum:2,root_delay_seconds:0.01,root_dispersion_seconds:0.01,reference_identifier:'TEST',reference_time_utc:'2026-08-27T00:00:00Z',offset_seconds:0,round_trip_delay_seconds:0.02,poll_interval_seconds:16,sample_set_sha256:HEX64};
  const clock=writeJson('clock',clockValue);
  const syncEvidence=writeRaw('sync-evidence','synchronization evidence');
  const sync=writeJson('sync',{synchronization_state:'synchronized',observed_at_utc:'2026-08-27T00:00:01Z',offset_seconds:options.syncMismatch?1:0,uncertainty_seconds:0.001,result:'pass',evidence_sha256:syncEvidence.body_sha256,evidence_custody_locator:syncEvidence.path});
  const mappingEvidence=writeRaw('mapping-evidence','mapping evidence');
  const mapping=writeJson('mapping',{mapping_version:'1',monotonic_clock_identifier:'mono',monotonic_sample_start:1,monotonic_sample_end:2,wall_clock_start_utc:'2026-08-27T00:00:01Z',wall_clock_end_utc:'2026-08-27T00:00:02Z',offset_seconds:0,uncertainty_seconds:0.001,mapping_body_sha256:mappingEvidence.body_sha256,mapping_custody_locator:mappingEvidence.path});
  const freshnessPolicyEvidence=writeRaw('freshness-policy-evidence','freshness policy evidence');
  const freshness=writeJson('freshness',{policy_id:'freshness-1',policy_version:'1',time_role:'source_origin_observation',maximum_age_seconds:options.freshnessMaximumAgeZero?0:3600,reference_time_role:'freshness_evaluation',uncertainty_treatment:'interval_bounds',failure_action:'fail_closed',policy_body_sha256:freshnessPolicyEvidence.body_sha256,policy_custody_locator:freshnessPolicyEvidence.path});
  const freshnessEvaluationEvidence=writeRaw('freshness-evaluation-evidence','freshness evaluation evidence');
  const freshnessEvaluation={policy_id:'freshness-1',subject_receipt_id:options.freshnessWrongRole?'source-observation-dns_observation':'source-observation-source_origin_observation',reference_receipt_id:'source-observation-freshness_evaluation',subject_interval:options.freshnessWrongRole?{lower_bound_utc:'2026-08-27T00:00:00.999000000Z',upper_bound_utc:'2026-08-27T00:00:01.001000000Z'}:{lower_bound_utc:options.freshnessIntervalInversion?'2026-08-27T00:00:02.001000001Z':'2026-08-27T00:00:01.999000000Z',upper_bound_utc:'2026-08-27T00:00:02.001000000Z'},reference_interval:{lower_bound_utc:'2026-08-27T00:00:03.199000000Z',upper_bound_utc:'2026-08-27T00:00:03.201000000Z'},computed_age_lower_bound_seconds:options.freshnessWrongRole?2.198:1.198,computed_age_upper_bound_seconds:options.freshnessWrongRole?2.202:1.202,result:'pass',evaluated_at_utc:'2026-08-27T00:00:03.200000000Z',evaluation_body_sha256:freshnessEvaluationEvidence.body_sha256,evaluation_custody_locator:freshnessEvaluationEvidence.path};
  const exactBinding=(written,schema)=>({path:written.path,blob_sha:written.blob_sha,body_sha256:written.body_sha256,content_type:written.content_type,schema_version:schema});
  const roleObserved={
    source_origin_observation:'2026-08-27T00:00:02.000000000Z',
    dns_observation:'2026-08-27T00:00:01.000000000Z',
    dns_expiry:'2026-08-27T00:10:01.000000000Z',
    connection_started:'2026-08-27T00:00:01.000000000Z',
    connection_established:'2026-08-27T00:00:02.000000000Z',
    tls_validation:'2026-08-27T00:00:04.000000000Z',
    certificate_validity_check:'2026-08-27T00:00:04.000000000Z',
    revocation_evidence_observation:'2026-08-27T00:00:04.000000000Z',
    certificate_transparency_evidence_observation:'2026-08-27T00:00:04.000000000Z',
    request_sent:options.requestBeforeConnection?'2026-08-27T00:00:00.500000000Z':'2026-08-27T00:00:03.000000000Z',
    response_headers_received:'2026-08-27T00:00:04.200000000Z',
    response_body_completed:'2026-08-27T00:00:04.600000000Z',
    connection_closed:'2026-08-27T00:00:05.000000000Z',
    freshness_evaluation:'2026-08-27T00:00:03.200000000Z'
  };
  const sourceObservationBindings=c.oc.temporal_reconciliation_rules.required_time_roles.map(role=>{
    const evidence=writeRaw(`source-observation-${role}`,`source observation ${role}`);
    return{role,receipt_id:`source-observation-${role}`,observed_at_utc:roleObserved[role],body_sha256:evidence.body_sha256,custody_locator:evidence.path};
  });
  const timeValue={};
  for(const field of c.oc.time_receipt_contract.required_fields)timeValue[field]=null;
  Object.assign(timeValue,{schema_version:c.oc.time_receipt_contract.schema_version,object_class:c.oc.time_receipt_contract.object_class,receipt_id:options.observationId??'time-1',event_chain_id:event,stage,clock_source_class:'authenticated_nts_ntp_clock',clock_source_identifier:'clock',clock_source_authority:'time authority',clock_source_authority_identifier:'time.example',clock_source_receipt_binding:exactBinding(clock,'fixture-clock-source@1'),synchronization_state:'synchronized',synchronization_receipt_binding:exactBinding(sync,'fixture-synchronization@1'),clock_resolution_seconds:0.001,clock_offset_seconds:0,clock_uncertainty_seconds:0.001,clock_drift_bound_ppm:1,holdover_started_at_utc:null,monotonic_clock_identifier:'mono',monotonic_sample_start:1,monotonic_sample_end:2,wall_clock_start_utc:'2026-08-27T00:00:01Z',wall_clock_end_utc:'2026-08-27T00:00:02Z',wall_to_monotonic_mapping_binding:exactBinding(mapping,'fixture-wall-monotonic-mapping@1'),clock_adjustment_events:[],leap_second_state:'no_pending_leap',leap_smear_policy:'none',source_observation_bindings:sourceObservationBindings,freshness_policy_binding:exactBinding(freshness,'fixture-freshness-policy@1'),freshness_evaluations:[freshnessEvaluation],temporal_order_reconciliation:{result:'pass'},observed_at_utc:'2026-08-27T00:00:03Z'});
  if(options.nullTimeBinding)timeValue.clock_source_receipt_binding=null;
  if(options.nullSourceObservationBinding)timeValue.source_observation_bindings[0].custody_locator=null;
  const time=writeJson('time',timeValue);
  const observationValue={
    ...overlay('observation_time_custody',options.observationId??'time-1'),
    observation_time_receipt_id:options.observationId??'time-1',observation_time_observed_at_utc:'2026-08-27T00:00:03Z',
    clock_source_class:'authenticated_nts_ntp_clock',clock_source_identifier:'clock',clock_source_authority:'time authority',clock_source_authority_identifier:'time.example',
    clock_source_receipt_sha256:clock.body_sha256,clock_source_custody_locator:clock.path,clock_source_repository_blob_sha_if_used:null,
    synchronization_state:'synchronized',synchronization_observed_at_utc:'2026-08-27T00:00:01Z',synchronization_receipt_sha256:sync.body_sha256,synchronization_custody_locator:sync.path,
    clock_resolution_seconds:0.001,clock_offset_seconds:0,clock_uncertainty_seconds:0.001,clock_drift_bound_ppm:1,holdover_started_at_utc:null,
    monotonic_clock_identifier:'mono',monotonic_sample_start:1,monotonic_sample_end:2,wall_clock_start_utc:'2026-08-27T00:00:01Z',wall_clock_end_utc:'2026-08-27T00:00:02Z',
    wall_to_monotonic_mapping_sha256:mapping.body_sha256,wall_to_monotonic_mapping_custody_locator:mapping.path,clock_adjustment_events:[],
    leap_second_state:'no_pending_leap',leap_smear_policy:'none',time_receipt_sha256:time.body_sha256,time_receipt_custody_locator:time.path,time_receipt_repository_blob_sha_if_used:null,
    freshness_policy_identifier:'freshness-1',freshness_policy_sha256:freshness.body_sha256,freshness_policy_custody_locator:freshness.path,freshness_evaluation_observed_at_utc:'2026-08-27T00:00:03.200000000Z',
    freshness_result:'pass',temporal_order_reconciliation:{result:'pass'},observation_time_custody_complete:true
  };
  const observation=writeJson('observation',observationValue);

  const temporalPolicy=writeJson('temporal-policy',{temporal_reconciliation_policy_identifier:'temporal-policy-1',result:'pass'});
  const sourceBindingByRole=new Map(sourceObservationBindings.map(binding=>[binding.role,binding]));
  let temporalIntervals=c.oc.temporal_reconciliation_rules.required_time_roles.map(role=>{
    const binding=sourceBindingByRole.get(role),[lower_bound_utc,upper_bound_utc]=intervalAround(binding.observed_at_utc);
    return{role,lower_bound_utc,upper_bound_utc,receipt_id:binding.receipt_id,body_sha256:binding.body_sha256,custody_locator:binding.custody_locator};
  });
  if(options.missingTemporalRole)temporalIntervals=temporalIntervals.filter(row=>row.role!=='freshness_evaluation');
  if(options.fractionalInversion){const row=temporalIntervals.find(item=>item.role==='request_sent');row.lower_bound_utc='2026-08-27T00:00:03.000000002Z';row.upper_bound_utc='2026-08-27T00:00:03.000000001Z';}
  if(options.temporalBindingMismatch){const row=temporalIntervals.find(item=>item.role==='dns_observation');row.body_sha256='b'.repeat(64);}
  const temporalValue={
    ...overlay('temporal_reconciliation_admission',options.temporalId??'temp-1'),
    temporal_reconciliation_result:'pass',temporal_order_reconciliation:{result:'pass'},
    temporal_reconciliation_policy_identifier:'temporal-policy-1',
    temporal_reconciliation_policy_sha256:temporalPolicy.body_sha256,
    temporal_reconciliation_policy_custody_locator:temporalPolicy.path,
    temporal_reconciliation_evaluated_at_utc:options.temporalEarlyEvaluation?'2026-08-27T00:00:04Z':'2026-08-27T00:10:02Z',
    temporal_intervals:temporalIntervals,
    temporal_reconciliation_complete:true
  };
  const temporal=writeJson('temporal',temporalValue);

  const binding=(written,id)=>({path:written.path,blob_sha:written.blob_sha,body_sha256:written.body_sha256,schema_version:written.schema_version,receipt_id:id,event_chain_id:event,stage});
  const stack={
    schema_version:c.liveContract.control_stack_receipt_contract.schema_version,
    object_class:c.liveContract.control_stack_receipt_contract.object_class,
    control_stack_receipt_id:'stack-1',registry_receipt_id:'registry-1',event_chain_id:event,stage,
    provenance_stage_receipt_binding:binding(provenance,provenanceValue.receipt_id),
    connection_authentication_receipt_binding:binding(connection,connectionValue.receipt_id),
    observation_time_receipt_binding:binding(observation,observationValue.receipt_id),
    temporal_reconciliation_receipt_binding:binding(temporal,temporalValue.receipt_id),
    temporal_reconciliation_result:'pass',all_bindings_valid:true,full_control_stack_complete:true,stage_admissible:true,observed_at_utc:options.stackObservedAfterRegistration?'2026-08-27T00:10:04Z':'2026-08-27T00:10:03Z'
  };
  const stackRel='receipts/m05/intel-realization/control-stack/stack-1.json';
  const stackAbs=path.join(root,...stackRel.split('/'));const stackBytes=jsonBytes(stack);fs.writeFileSync(stackAbs,stackBytes);
  const registry={
    schema_version:c.liveContract.live_registry.schema_version,
    object_class:'bounded_intel_realization_live_stage_receipt_control_stack_registry',
    program_id:'M-05',sprint_id:'M05-SPRINT-03',leg_id:'S03-L7',issue:345,as_of:options.badAsOf?'2026-02-30':'2026-08-19',
    status:'intel_realization_live_control_stack_registry_waiting_for_ordinary_gate',
    policy_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-live-registry-contract.json',schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-live-registry-contract@1',semantic_sha256:'95936ed4d6220a62d4f433fa317efc225f0c3e9eab92a22015bff6826ceb1ee3'},
    legacy_registry_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json',blob_sha:'e8ff7438814f79309964b75805d5f945bd0bcbd8',schema_version:'m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1',bytes_remain_frozen:true},
    ordinary_gate_utc:'2026-08-27T00:00:00Z',stage_order:STAGES,
    receipts:[{
      registry_receipt_id:'registry-1',event_chain_id:event,stage,predecessor_registry_receipt_id:null,
      control_stack_receipt_id:'stack-1',registered_at_utc:options.badDate??'2026-08-27T00:10:03.500000000Z',
      control_stack_receipt_path:stackRel,control_stack_receipt_blob_sha:blob(stackBytes),control_stack_receipt_body_sha256:sha(stackBytes)
    }],
    observed_state:{registered_stage_receipts:1,registered_control_stack_receipts:1,fully_bound_control_stack_receipts:1,passing_temporal_reconciliations:1,transaction_admissible:true,federal_cash_custody_admissible:false,public_account_booking_admissible:false,distribution_admissible:false,answer_change_authorized:false},
    boundaries:{registry_is_transaction:false,registry_is_federal_cash_receipt:false,registry_is_public_account_booking:false,registry_is_distribution:false,registry_is_answer_effectiveness:false,graph_effect:'none',project_complete:false,issue_345_may_close:false}
  };
  if(options.stackBindingDrift)registry.receipts[0].control_stack_receipt_body_sha256='b'.repeat(64);
  if(options.registryBindingDrift)registry.policy_binding.path='data/project/wrong.json';
  if(options.emptyEvent){registry.receipts[0].event_chain_id='';stack.event_chain_id='';}
  if(options.missingBoundary)delete registry.boundaries.project_complete;
  if(options.namespaceEscape){
    const outside=path.join(root,'outside');fs.mkdirSync(outside,{recursive:true});
    fs.copyFileSync(path.join(root,...provenance.path.split('/')),path.join(outside,'provenance.json'));
    stack.provenance_stage_receipt_binding.path='outside/provenance.json';
    const updated=jsonBytes(stack);fs.writeFileSync(stackAbs,updated);
    registry.receipts[0].control_stack_receipt_blob_sha=blob(updated);
    registry.receipts[0].control_stack_receipt_body_sha256=sha(updated);
  }
  if(options.duplicateSourceIdAcrossStacks){
    const event2='event-2';
    const copyTop=(written,label)=>{
      const value=JSON.parse(fs.readFileSync(path.join(root,...written.path.split('/')),'utf8'));
      value.event_chain_id=event2;
      return writeJson(label,value);
    };
    const p2=copyTop(provenance,'provenance-2');
    const c2=copyTop(connection,'connection-2');
    const o2=copyTop(observation,'observation-2');
    const t2=copyTop(temporal,'temporal-2');
    const stack2={...stack,control_stack_receipt_id:'stack-2',registry_receipt_id:'registry-2',event_chain_id:event2,
      provenance_stage_receipt_binding:{...binding(p2,provenanceValue.receipt_id),event_chain_id:event2},
      connection_authentication_receipt_binding:{...binding(c2,connectionValue.receipt_id),event_chain_id:event2},
      observation_time_receipt_binding:{...binding(o2,observationValue.receipt_id),event_chain_id:event2},
      temporal_reconciliation_receipt_binding:{...binding(t2,temporalValue.receipt_id),event_chain_id:event2}};
    const rel2='receipts/m05/intel-realization/control-stack/stack-2.json';
    const bytes2=jsonBytes(stack2);fs.writeFileSync(path.join(root,...rel2.split('/')),bytes2);
    registry.receipts.push({registry_receipt_id:'registry-2',event_chain_id:event2,stage:'transaction',predecessor_registry_receipt_id:null,
      control_stack_receipt_id:'stack-2',registered_at_utc:'2026-08-27T00:00:07Z',
      control_stack_receipt_path:rel2,control_stack_receipt_blob_sha:blob(bytes2),control_stack_receipt_body_sha256:sha(bytes2)});
    registry.observed_state.registered_stage_receipts=2;
    registry.observed_state.registered_control_stack_receipts=2;
    registry.observed_state.fully_bound_control_stack_receipts=2;
    registry.observed_state.passing_temporal_reconciliations=2;
  }
  if(options.intermediateSymlink){
    const real=path.join(root,'real-source');fs.renameSync(sourceDir,real);
    fs.symlinkSync(real,sourceDir,'dir');
  }
  let receiptRoot=root,returnedStackDir=stackDir,aliasRoot=null;
  if(options.stackRootAncestorSymlink){
    const intelRoot=path.join(root,'receipts/m05/intel-realization'),realIntelRoot=path.join(root,'real-intel-realization');
    fs.renameSync(intelRoot,realIntelRoot);
    fs.symlinkSync(realIntelRoot,intelRoot,'dir');
  }
  if(options.receiptRootAncestorSymlink){
    aliasRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-stage-stack-root-alias-'));
    const parentLink=path.join(aliasRoot,'linked-parent');
    fs.symlinkSync(path.dirname(root),parentLink,'dir');
    receiptRoot=path.join(parentLink,path.basename(root));
    returnedStackDir=path.join(receiptRoot,'receipts/m05/intel-realization/control-stack');
  }
  return{c,root:receiptRoot,stackDir:returnedStackDir,registry,cleanup:()=>{if(aliasRoot)fs.rmSync(aliasRoot,{recursive:true,force:true});fs.rmSync(root,{recursive:true,force:true});}};
};

const invokeFixture=fixture=>validateStageStack({
  raw:{},repair,policy:fixture.c.policy,liveContract:fixture.c.liveContract,liveRegistry:fixture.registry,
  legacyRegistry:fixture.c.legacyRegistry,pc:fixture.c.pc,cc:fixture.c.cc,oc:fixture.c.oc,tc:fixture.c.tc,
  receiptRoot:fixture.root,stackRoot:fixture.stackDir
});

const positive=writeFixture();
const output=invokeFixture(positive);
assert.equal(output.registered_stage_receipts,1);
assert.equal(output.transaction_admissible,true);
positive.cleanup();

for(const options of [
  {nullConnection:true},
  {nullNestedDns:true},
  {nullDnsAnswer:true},
  {nullProxyEntry:true},
  {tlsEvidenceFail:true},
  {syncMismatch:true},
  {nullClockProfile:true},
  {nullTimeBinding:true},
  {nullSourceObservationBinding:true},
  {freshnessIntervalInversion:true},
  {acquisitionLengthMismatch:true},
  {invalidAcquisitionRedirect:true},
  {tlsLeafMismatch:true},
  {namespaceEscape:true},
  {stackBindingDrift:true},
  {registryBindingDrift:true},
  {emptyEvent:true},
  {missingBoundary:true},
  {missingTemporalRole:true},
  {fractionalInversion:true},
  {requestBeforeConnection:true},
  {temporalEarlyEvaluation:true},
  {stackObservedAfterRegistration:true},
  {badAsOf:true},
  {badDate:'2026-13-01T00:00:06Z'},
  {intermediateSymlink:true},
  {stackRootAncestorSymlink:true},
  {duplicateSourceIdAcrossStacks:true},
  {provenancePredecessorNonNull:true},
  {applicationAuthorityMismatch:true},
  {freshnessMaximumAgeZero:true},
  {temporalBindingMismatch:true},
  {missingProtocolEvidence:true},
  {freshnessWrongRole:true},
  {sameRoleNestedReuse:true},
  {receiptRootAncestorSymlink:true}
]){
  const fixture=writeFixture(options);
  assert.throws(()=>invokeFixture(fixture),undefined,JSON.stringify(options));
  fixture.cleanup();
}

const workflowPath=path.join(ROOT,'.github/workflows/m05-intel-realization-stage-receipt-control-stack-amendment.yml');
if(fs.existsSync(workflowPath)){
  const workflow=fs.readFileSync(workflowPath,'utf8');
  const requiredPaths=[
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-postmerge-repair.json',
    'receipts/m05/intel-realization/**',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test.js',
    '.github/workflows/m05-intel-realization-provenance-object-custody.yml',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js',
    '.github/workflows/m05-intel-realization-connection-authentication-custody-amendment.yml',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js',
    '.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs',
    'test/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.test.js',
    '.github/workflows/m05-intel-realization-temporal-reconciliation-admission-amendment.yml'
  ];
  for(const required of requiredPaths)assert.ok(workflow.includes(`'${required}'`),`workflow missing ${required}`);
}

const immutableBaseline=[
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.json',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-live-registry-contract.json',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-registry.json',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json',
  'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs',
  'test/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.test.js',
  '.github/workflows/m05-intel-realization-provenance-object-custody.yml',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json',
  'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs',
  'test/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.test.js',
  '.github/workflows/m05-intel-realization-connection-authentication-custody-amendment.yml',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json',
  'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs',
  'test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js',
  '.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml',
  'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.json',
  'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.mjs',
  'test/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.test.js',
  '.github/workflows/m05-intel-realization-temporal-reconciliation-admission-amendment.yml'
];
if(immutableBaseline.every(relative=>fs.existsSync(path.join(ROOT,relative)))){
  const baseline=spawnSync(process.execPath,[VALIDATOR],{cwd:ROOT,encoding:'utf8'});
  assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
  const parsed=JSON.parse(baseline.stdout);
  assert.equal(parsed.registered_stage_receipts,0);
  assert.equal(parsed.issue_345_may_close,false);
}

console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-control-stack-amendment.test: OK');
