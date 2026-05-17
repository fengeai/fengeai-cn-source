// const fetch = require('node-fetch'); // Use native fetch in Node 18+

async function testDelete() {
    const url = 'http://47.121.114.176:3000/api/projects/test-id-not-exist';
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('ACCESS_TOKEN is required');
    }
    console.log(`Testing DELETE ${url}...`);

    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: accessToken })
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log('Body:', text.substring(0, 500)); // Print first 500 chars

        try {
            JSON.parse(text);
            console.log('Body is valid JSON.');
        } catch (e) {
            console.log('Body is NOT valid JSON.');
        }

    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testDelete();
