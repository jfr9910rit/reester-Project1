const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const CLIENT_PATH = path.join(__dirname, '../client');  // Path to client folder
const DATA_FILE = path.join(__dirname, '../destiny2_data.json');  // Path to the new Destiny 2 dataset

// Load data from the JSON file into memory
let dataset = [];
fs.readFile(DATA_FILE, 'utf8', (err, data) => {
  if (err) {
    console.error('Error loading data:', err);
    return;
  }
  dataset = JSON.parse(data);
});

// Sample gear data
const sampleWeapons = [
  { name: "The Last Word", type: "Hand Cannon", damage_type: "Kinetic", perk: "Fan Fire - Rapidly fires hip-fired shots" },
  { name: "Anarchy", type: "Grenade Launcher", damage_type: "Arc", perk: "Arc Traps - Creates Arc energy traps" },
  { name: "Ace of Spades", type: "Hand Cannon", damage_type: "Kinetic", perk: "Firefly - Precision kills cause targets to explode" },
  { name: "The Recluse", type: "Submachine Gun", damage_type: "Kinetic", perk: "Master of Arms - After a kill, all weapons deal increased damage" }
];

const sampleArmor = [
  { name: "Dunemarchers", type: "Leg Armor", stats: { mobility: 8, resilience: 12, recovery: 6 }, rarity: "Legendary" },
  { name: "Helm of Saint-14", type: "Helmet", stats: { mobility: 4, resilience: 15, recovery: 10 }, rarity: "Exotic" },
  { name: "St0mp-EE5", type: "Leg Armor", stats: { mobility: 15, resilience: 7, recovery: 5 }, rarity: "Legendary" },
  { name: "Celestial Nighthawk", type: "Helmet", stats: { mobility: 3, resilience: 10, recovery: 13 }, rarity: "Exotic" }
];

// Function to get a random item from a list
function getRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Function to handle the different API requests
const requestHandler = (req, res) => {
  const { method, url: requestUrl } = req;
  const parsedUrl = url.parse(requestUrl, true);
  const pathname = parsedUrl.pathname;

  // Middleware to handle Content-Type and Content-Length headers
  res.setHeader('Content-Type', 'application/json');

  // Serve the HTML file with correct Content-Type
  if (method === 'GET' && (pathname === '/' || pathname === '/client.html')) {
    fs.readFile(path.join(CLIENT_PATH, 'client.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Serve the CSS file with correct Content-Type
  if (method === 'GET' && pathname === '/style.css') {
    fs.readFile(path.join(CLIENT_PATH, 'style.css'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(data);
    });
    return;
  }

  // Serve static JS files (if needed)
  if (method === 'GET' && pathname.endsWith('.js')) {
    fs.readFile(path.join(CLIENT_PATH, pathname), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
    return;
  }

  // GET /data/characters - Retrieve all characters with optional filtering by subclass
  if (method === 'GET' && pathname === '/data/characters') {
    let characters = dataset.characters;

    // Apply filtering by subclass if query parameter is provided
    if (parsedUrl.query.subclass) {
      characters = characters.filter(character => character.subclass.toLowerCase() === parsedUrl.query.subclass.toLowerCase());
    }

    res.writeHead(200);
    res.end(JSON.stringify(characters));
    return;
  }

  // GET /data/characters/:id - Retrieve specific character by ID along with their gear (weapons and armor)
  if (method === 'GET' && pathname.startsWith('/data/characters/')) {
    const id = pathname.split('/')[3];  // Extract character id from the URL
    const character = dataset.characters.find(c => c.id === id);
    if (character) {
      res.writeHead(200);
      res.end(JSON.stringify(character));  // Return character with gear
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Character not found' }));
    }
    return;
  }

  // POST /data/characters - Add new character with user input for gear
if (method === 'POST' && pathname === '/data/characters') {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const newCharacter = JSON.parse(body);
      newCharacter.id = Date.now().toString();  // Generate a unique ID

      // Add the new character to the dataset
      dataset.characters.push(newCharacter);

      // Save the updated dataset back to the file
      fs.writeFile(DATA_FILE, JSON.stringify(dataset, null, 2), (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Error saving data');
          return;
        }
        res.writeHead(201);
        res.end(JSON.stringify(newCharacter));  // Return the newly created character with gear
      });
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ message: 'Invalid JSON data' }));
    }
  });
  return;
}

  // DELETE /data/characters/:id - Delete character by ID
  if (method === 'DELETE' && pathname.startsWith('/data/characters/')) {
    const id = pathname.split('/')[3];  // Extract character id from the URL
    const characterIndex = dataset.characters.findIndex(c => c.id === id);
    if (characterIndex === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Character not found' }));
      return;
    }

    // Remove the character from the dataset
    dataset.characters.splice(characterIndex, 1);

    // Save the updated dataset back to the file
    fs.writeFile(DATA_FILE, JSON.stringify(dataset, null, 2), (err) => {
      if (err) {
        res.writeHead(500);
        res.end('Error saving data');
        return;
      }
      res.writeHead(204);  // No content for successful delete
      res.end();
    });
    return;
  }

  // Handle invalid routes (404)
  res.writeHead(404);
  res.end(JSON.stringify({ message: 'Route not found' }));
};

// Create server and listen
const server = http.createServer(requestHandler);
server.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
