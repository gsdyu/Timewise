const Groq = require("groq-sdk")
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// if running wiht index.js, you do not need to import .env.local here; does in index
//require ('dotenv').config({path:'../../.env.local'})

//const groq = new Groq({apiKey: process.env.GROQ_API_KEY});

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
  });

const client = new Groq({});

//parameters for groq
var model = "llama3-8b-8192";
var history = [];
var max_tokens = 300;
var temperature = 1;
var stream = false;

async function initChat(content = "You are an assistant. You may be provided with context of json events. These events may not provided by the user but by RAG from the system so do not assume they are from the user.") {
  const system = {role: "system", content: content}
	history.push(system);
	var check = client.chat.completions.create({
		messages: history,
		model: model,
		max_tokens: 100,
		})
	return 1;
}

async function inputChat(input) {

	const result = await pool.query('SELECT * FROM users WHERE email = $1', ['ttoantran603@gmail.com']);
	const user = result.rows[0];

	const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

	history.push({role: "user", content: input});
	var completions = await client.chat.completions.create({
		messages: history,
		model: model,
		temperature: temperature,
		max_tokens: max_tokens,
	});
	var message = completions.choices[0].message.content; 
	history.push({role: "assistant", content: message});

	let eventDetails;
	try {
	  eventDetails = JSON.parse(message);
	} catch (error) {
	  console.error('Error parsing JSON:', error);
	  return message;
	}
  
	const startDateTime = new Date(`${eventDetails.date} ${eventDetails.start_time}`);
	const endDateTime = new Date(`${eventDetails.date} ${eventDetails.end_time}`);
  
	if (endDateTime <= startDateTime) {
	  return 'Error: End time must be after start time.';
	}
  

	const body = {
	  title: eventDetails.title,
	  description: eventDetails.description || '',
	  start_time: startDateTime.toISOString(),
	  end_time: endDateTime.toISOString(),
	  location: eventDetails.location || '',
	  frequency: eventDetails.frequency,
	  calendar: eventDetails.calendar,
	  time_zone: eventDetails.time_zone,
	};
  
	try {
	  const response = await fetch('http://localhost:5000/events', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${token}`,
		},
		body: JSON.stringify(body),
	  });
  
	  if (!response.ok) {
		const errorData = await response.json();
		console.error('Error creating event:', errorData);
		return `Error: ${errorData.error}`;
	  }
  
	  const result = await response.json();
	  return `Event created: ${result.event.title}`;
	} catch (error) {
	  console.error('Fetch error:', error);
	  return 'Error creating event.';
	}	
}

function clearChat(priorSystem){
	if (typeof(priorSystem) != typeof(true)){
		throw new TypeError("Input should be an actual boolean");
	}
	if (priorSystem && history.length != 0) {
		history = [history[0]];	
	}
	history = [];
	return 1;
}

function giveContext(context){
  //optional console.log to show RAG queries
  console.log("\nRetrieved the following from RAG:\n", context);
  console.log("\n")
  history.push({role: "user", content: context});
  return 1;
}

const system = `You are an assistant for a calendar app. You provide helpful insight and feedback to the user based on their wants, 
and their current and future events/responsibilities. When asked to create new events, provide just a event object in the same format you recieve from RAG without any other text. 
You can respond normally when not specifically ask to create a new event. Being realistic is important, do whats best for the user, 
but also whats possible. The current date is ${new Date().toISOString()} Do not mention the following to the user: 
You may be given related events from the user's calendar, where the event of the earliest index is most related. 
Do not assume you have been given the list; instead act like an oracle that just knows the events. When listing multiple events, format it nicely so it is readable. 
Your token limit is 300; do not go above.`
initChat(system);
//inputChat("Is your name Frankenstein or Frankeinstein's monster?").then(value=>console.log(value)).catch(reason=>console.log(reason));
//inputChat("oh what is your real name?").then(value=>console.log(value)).catch(reason=>console.log(reason));
//inputChat("do you know my name").then(value=>console.log(value)).catch(reason=>console.log(reason));

module.exports = { inputChat, initChat, clearChat, giveContext};



