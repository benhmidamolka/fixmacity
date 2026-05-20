const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { analyzePhoto } = require('../src/services/vision.service');

// Provide a dummy image path
const testImagePath = path.join(__dirname, '../uploads/test_dummy.jpg');

// Create a dummy 1x1 jpg image
const fs = require('fs');
if (!fs.existsSync(path.dirname(testImagePath))) {
  fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
}
const dummyJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
fs.writeFileSync(testImagePath, Buffer.from(dummyJpgBase64, 'base64'));

(async () => {
  try {
    const result = await analyzePhoto(testImagePath, { category: 'Voirie' });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    try { fs.unlinkSync(testImagePath); } catch (e) {}
  }
})();
