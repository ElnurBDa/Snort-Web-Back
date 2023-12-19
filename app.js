const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const dotenv = require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// const alertsPath = path.join(__dirname, "alerts_mini.txt");
const alertsPath = process.env.ALERTS_PATH 
const blockPath = path.join(__dirname, "blockList.json");

const errorData = {
    time: "error",
    protocol: "error",
    msg: "error",
    priority: -1,
    src_ip: "error",
    src_port: "error",
    dst_ip: "error",
    dst_port: "error"
}

function parseLogData(data) {
    return data.split('\n').map(entry => {
        try {
            const parts = entry.split(' ');
            const time = parts[0].replace(/\r$/, '');
            const msgStartIndex = parts.findIndex(p => p === '[**]') + 1;
            const msgEndIndex = parts.lastIndexOf('[**]');
            const msg = parts.slice(msgStartIndex, msgEndIndex).join(' ');
            const priorityIndex = parts.findIndex(p => p.includes('[Priority:'));
            const priority = parts[priorityIndex+1].match(/\d+/)[0];
            const protocol = parts.find(p => p.startsWith('{')).replace(/[{}]/g, '');
            const srcDstIndex = parts.indexOf('->');
            const src = parts[srcDstIndex - 1].split(':');
            const dst = parts[srcDstIndex + 1].split(':');
    
            return {
                time,
                protocol,
                msg,
                priority,
                src_ip: src[0],
                src_port: src[1] || '',
                dst_ip: dst[0],
                dst_port: dst[1] || ''
            };
        } catch (error) {
            return errorData;
        }
    });
}


app.get("/", (req, res) => {
    res.send("Endpoints: ||| GET: /alerts, /block ||| POST: /block/:ip");
});

app.get("/alerts", (req, res) => {
    fs.readFile(alertsPath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading the log file');
            return;
        }
        const entries = parseLogData(data).slice(-100);
        res.json(entries);
    });
});

app.post("/block", (req, res) => {
    const newEntry = {
        time: new Date().toISOString(), 
        ip: req.body.ip,
        msg: req.body.msg 
    };

    try {
        const data = fs.readFileSync(blockPath, "utf8");
        const blockList = JSON.parse(data);
        if (blockList.blockList.find(entry => entry.ip === newEntry.ip)) {
            res.status(400).send('IP already in the block list');
            return;
        }
        blockList.blockList.push(newEntry);
        fs.writeFileSync(blockPath, JSON.stringify(blockList, null, 2)); 
        res.send("OK");
    } catch (error) {
        res.status(500).send('Error processing the request');
    }
});


app.get("/block", (req, res) => {
    const data = fs.readFileSync(blockPath, "utf8");
    try {
        const JSONedData = JSON.parse(data);
        res.json(JSONedData);
    } catch (error) {
        res.status(500).send('Error parsing the JSON data');
    }
});



app.listen(3000, () => {
    console.log("Server is listening on port 3000. Ready to accept requests!");
});
