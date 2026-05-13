const bcrypt = require('bcrypt');

const hash = '$2b$12$PlohpUL1hxTEclO5ayimt.ED59ZTkBeSdxbjaD3OmVRSxhJPyoP.y';
const password = 'Password123!';

async function test() {
  const match = await bcrypt.compare(password, hash);
  console.log('Match:', match);
}

test();
