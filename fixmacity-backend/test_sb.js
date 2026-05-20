const supabase = require('./src/config/db');
async function test() {
  try {
    const { data, error } = await supabase.from('declarations').select('*').limit(1);
    if (error) throw error;
    if (data.length > 0) {
      console.log(Object.keys(data[0]).join(', '));
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
test();
