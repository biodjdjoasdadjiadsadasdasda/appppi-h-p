const WebSocket = require("ws")
const axios = require("axios")
const http = require("http")

const TOKEN = process.env.DISCORD_TOKEN

const API = "https://apihop-test-9hcq.onrender.com/push"
const API_ID = "69ow6krx5wm"

const channels = {
  "1450081431932899368": "full_moon",
  "1510171866705428480": "elite",
  "1485223593087471777": "haki",
  "1450081260150980743": "daobian"
}

const pushed = new Map()

// Bảng encode theo yêu cầu
const encodeMap = {
  "a":"xK#7", "b":"mP@2z", "c":"Qw$9", "d":"L%4v", "e":"V&8n", "f":"T*1r",
  "g":"Y(7p", "h":"N)5x", "i":"B_3t", "j":"A+9m", "k":"R=6k", "l":"M-1q",
  "m":"C[8y", "n":"D]4w", "o":"U{2e", "p":"H}7r", "q":"B|5t", "r":"J/9u",
  "s":"F?3i", "t":"G>6o", "u":"X<1a", "v":"Z@8s", "w":"E#4d", "x":"I$7f",
  "y":"O%2g", "z":"P^9h",
  "A":"mX7@", "B":"nQ2#", "C":"vL8$", "D":"sK1%", "E":"pR4^", "F":"uT6&",
  "G":"xY3*", "H":"bW5(", "I":"cE9)", "J":"dF7_", "K":"eG2+", "L":"fH8=",
  "M":"gJ1-", "N":"hK4[", "O":"iL6]", "P":"jM3{", "Q":"kN5}", "R":"lP9|",
  "S":"oA7/", "T":"qB2?", "U":"rC8>", "V":"tD1<", "W":"wF4@", "X":"yG6#",
  "Y":"zH3$", "Z":"aJ5%",
  "0":"kL9^", "1":"xT2&", "2":"mN4*", "3":"pQ6(", "4":"rS8)", "5":"tU1_",
  "6":"vW3+", "7":"yX5=", "8":"zY7-", "9":"bZ9[",
  "-":"Aa1]", "_":"Bb2{"
}

// Hàm encode job id
const encodeJobId = (jobId) => {
  let encoded = "KuriWasHere"
  
  for(let i = 0; i < jobId.length; i++) {
    const char = jobId[i]
    if(encodeMap[char]) {
      encoded += encodeMap[char]
    } else {
      encoded += char
    }
  }
  
  encoded += "=="
  return encoded
}

const getJobId = t => {
  const match = t.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  )
  return match ? match[0] : undefined
}

const parseExtra = t => {
  let playersMatch = t.match(/(\d{1,2})\s*p/i)
  let players = playersMatch ? +playersMatch[1] : 1
  if (players < 1) players = 1
  if (players > 12) players = 12

  let seaMatch = t.match(/sea\s*(\d)/i)
  let sea = seaMatch ? +seaMatch[1] : 1
  if (sea < 1) sea = 1
  if (sea > 3) sea = 3

  return { players, sea }
}

let ws
let hb

const connect = () => {

  ws = new WebSocket(
    "wss://gateway.discord.gg/?v=10&encoding=json"
  )

  ws.on("message", async raw => {

    let data

    try{

      data = JSON.parse(raw.toString())

    }catch{

      return

    }

    if(data.op === 10){

      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: TOKEN,
          intents: 33281,
          properties: {
            os: "Windows",
            browser: "Chrome",
            device: ""
          },
          presence: {
            status: "online",
            since: 0,
            activities: [],
            afk: false
          }
        }
      }))

      hb = setInterval(() => {

        if(ws.readyState === 1){

          ws.send(JSON.stringify({
            op: 1,
            d: null
          }))

        }

      }, data.d.heartbeat_interval)

      return

    }

    if(data.op === 9){

      console.log("invalid discord token")

      process.exit()

    }

    if(data.t !== "MESSAGE_CREATE") return

    const m = data.d

    let text = m.content ? m.content : ""
    
    if (m.embeds && m.embeds.length > 0) {
      const embedTexts = m.embeds.map(e => {
        let parts = []
        if (e.title) parts.push(e.title)
        if (e.description) parts.push(e.description)
        if (e.fields && e.fields.length > 0) {
          parts.push(...e.fields.map(f => f.value ? f.value : ""))
        }
        return parts.join("\n")
      })
      if (text.length > 0 && embedTexts.length > 0) {
        text = text + "\n" + embedTexts.join("\n")
      } else if (embedTexts.length > 0) {
        text = embedTexts.join("\n")
      }
    }

    const boss = channels[m.channel_id]

    if(!boss) return

    const job = getJobId(text)

    if(!job) return

    if(pushed.has(job)) return

    pushed.set(job, 1)

    setTimeout(() => {

      pushed.delete(job)

    }, 30000)

    const { players, sea } = parseExtra(text)
    
    // Encode job id trước khi gửi
    const encodedJob = encodeJobId(job)
    
    console.log(`Original job: ${job}`)
    console.log(`Encoded job: ${encodedJob}`)

    try{

      await axios.post(
        API,
        {
          id: API_ID,
          job: encodedJob,  // Gửi job đã encode
          boss,
          players,
          sea
        },
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
      
      console.log(`Đã gửi thành công: ${boss} - ${encodedJob}`)

    } catch(error) {
      console.log(`Lỗi khi gửi: ${error.message}`)
    }

  })

  ws.on("close", () => {

    clearInterval(hb)

    setTimeout(connect, 5000)

  })

  ws.on("error", (err) => {
    console.log(`WebSocket error: ${err.message}`)
  })

}

if(!TOKEN){

  console.log("missing DISCORD_TOKEN")

}else{

  connect()

}

// Thêm self-ping để giữ awake
setInterval(() => {
  http.get(`http://localhost:${process.env.PORT || 3000}`, (res) => {
    console.log('Self-ping thành công')
  }).on('error', (err) => {
    console.log('Self-ping lỗi:', err.message)
  })
}, 280000)

http.createServer((req,res)=>{

  res.end("Inited")

}).listen(process.env.PORT || 3000)
