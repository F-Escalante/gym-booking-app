const fs = require('fs');
const path = require('path');

// load .env.local
const dotenvPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  const env = fs.readFileSync(dotenvPath, 'utf8');
  env.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const { createClient } = require('@supabase/supabase-js');
// Use ws transport for Node.js < 22
let supabase;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
try {
  const ws = require('ws');
  if (serviceKey) {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, { realtime: { transport: ws } });
    console.log('Using SERVICE_ROLE key for Supabase client (server-mode)');
  } else {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey, { realtime: { transport: ws } });
    console.log('Using ANON key for Supabase client (unauthenticated)');
  }
} catch (e) {
  if (serviceKey) supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey);
  else supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey);
}

(async () => {
  try {
    console.log('Fetching up to 5 classes...');
    let resp = await supabase.from('classes').select('*').limit(5);
    console.log('fetch status', resp.status);
    console.log('fetch error', resp.error);
    console.log('classes:', resp.data);

    if (!resp.data || resp.data.length === 0) {
      console.log('No classes found. Inserting a temporary class for testing.');
      const { data: inserted, error: insertErr } = await supabase.from('classes').insert({
        title: 'temp-test',
        description: 'temp',
        class_date: new Date().toISOString(),
        capacity: 1
      }).select().maybeSingle();
      if (insertErr) { console.error('insertErr', insertErr); return; }
      console.log('inserted temp class', inserted);
      resp.data = [inserted];
    }

    const original = resp.data[0];
    console.log('Original row:', original);

    console.log('\nAttempting update with .select().maybeSingle()...');
    const { data: updated, error: updateErr, status: updateStatus } = await supabase
      .from('classes')
      .update({ title: (original.title || '') + ' [test-update]' })
      .eq('id', original.id)
      .select()
      .maybeSingle();

    console.log('updateStatus', updateStatus);
    console.log('updateErr', updateErr);
    console.log('updated', updated);

    // revert
    if (updated) {
      const { data: reverted, error: revertErr } = await supabase
        .from('classes')
        .update({ title: original.title })
        .eq('id', original.id)
        .select()
        .maybeSingle();
      console.log('reverted', reverted, 'revertErr', revertErr);
    }

    console.log('\nTesting delete on a newly inserted temp row...');
    const { data: temp, error: tempInsertErr } = await supabase.from('classes').insert({
      title: 'temp-to-delete',
      description: 'delete-me',
      class_date: new Date().toISOString(),
      capacity: 1
    }).select().maybeSingle();
    if (tempInsertErr) { console.error('tempInsertErr', tempInsertErr); return; }
    console.log('temp inserted', temp);

    const { data: deleted, error: deleteErr, status: deleteStatus } = await supabase
      .from('classes')
      .delete()
      .eq('id', temp.id)
      .select()
      .maybeSingle();

    console.log('deleteStatus', deleteStatus);
    console.log('deleteErr', deleteErr);
    console.log('deleted', deleted);

    console.log('\nDone.');
  } catch (e) {
    console.error('Unexpected error', e);
  }
})();
