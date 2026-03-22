const fetch = require('node-fetch');
async function list() {
    const key = 'AIzaSyC3me_jMvxSnjW7yj03koDXr9uQEGHFXCk';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
list();
