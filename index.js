const express = require('express');

const app = express();
const port = 3000;
const predictions = [
    "How are you?",
    "Good Morning",
    "Please share your resume",
];
const randomFortune = predictions[Math.floor(Math.random()*predictions.length)];

app.post("/predict",(req,res) =>{
    res.json({
        "num_predictions":"1",
        "predictions":[
            randomFortune
        ]
    })
})

app.use(express.static('public'));

app.listen(port,()=>{
    console.log('server started');
})

