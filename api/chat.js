const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { message, userid } = req.body;

        const params = new URLSearchParams();
        params.append('message', message);
        params.append('dialogs[0][role]', 'user');
        params.append('dialogs[0][content]', message);
        params.append('userid', userid);

        const response = await axios.post(
            'https://qudata.com/ru/includes/sendmail/chat.php',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );

        res.status(200).send(response.data);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
};
