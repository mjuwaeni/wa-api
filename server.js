const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const express = require('express');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');

// initial instance
const PORT = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const client = new Client({
    authStrategy: new LocalAuth()
});

// index routing and middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname});
});

// initialize whatsapp and the example event
client.on('message', msg => {
  if (msg.body == 'Assalamu\'alaikum') {
    msg.reply('Wa\'alaikumussalam warahmatullah');
  } else if (msg.body == 'P') {
    msg.reply('Hi');
  }
});
client.initialize();

// socket connection
var today  = new Date();
var now = today.toLocaleString();
io.on('connection', (socket) => {
  socket.emit('message', `${now} Connected`);

  client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit('message', `${now} QR Code received`);
    });
  });

  client.on('ready', () => {
    socket.emit('message', `${now} WhatsApp is ready!`);
  });

  client.on('authenticated', () => {
    socket.emit('message', `${now} Whatsapp is authenticated!`);
  });

  client.on('auth_failure', function(session) {
    socket.emit('message', `${now} Auth failure, restarting...`);
  });

  client.on('disconnected', function() {
    socket.emit('message', `${now} Disconnected`);
    client.destroy();
    client.initialize();
  });
});

// send message routing
app.post('/send', async (req, res) => {
    let nohp = req.query.nohp || req.body.nohp
    const pesan = req.query.pesan || req.body.pesan
    const gambar = req.query.gambar || req.body.gambar

    if(nohp.startsWith('0')){
        nohp = '62'+nohp.slice(1)+'@c.us'
    }else if(nohp.startsWith('62')){
        nohp = nohp+'@c.us'
    }

    const user = await client.isRegisteredUser(nohp)

    if(user){
        if(gambar !== undefined && gambar !== null && gambar !== ""){
            let media = await MessageMedia.fromUrl(gambar, {unsafeMine: true})

            client.sendMessage(nohp, media, {caption: pesan})
            res.json({status: 'Berhasil Terkirim', pesan:media.filename})
        }else{
        client.sendMessage(nohp, pesan);
        res.json({status: 'Berhasil Terkirim', pesan})
        }
    }else{
        res.json({status: 'Gagal', pesan: "nomor wa tidak terdaftar"})
    }
});

server.listen(PORT, () => {
  console.log('App listen on port ', PORT);
});
