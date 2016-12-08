#!/usr/bin/env node
/* eslint-disable no-console */
const meow = require('meow');
const https = require('https');
const querystring = require('querystring');
const AmazonListScraper = require('amazon-list-scraper');

const help = `
Usage
  $ amazon-list-telegram-bot-cli <amazon-list-url> <telegram-bot-token> <telegram-chat-id>

Example
  $ amazon-list-telegram-bot-cli 'https://www.amazon.com/gp/registry/wishlist/XXX' 'YYY' 'ZZZ'

  (replace XXX, YYY, ZZZ with your Amazon list ID, Telegram bot token and chat ID)

Tips
  - You can also provide a amazon list URL with filter and sort params
    e.g. ?sort=universal-price&filter=price-drop
`;

const cli = meow({
  help,
});

const input = cli.input;
if (input.length < 3) {
  cli.showHelp(1);
}

const listUrl = input[0];
const botToken = input[1];
const chatId = input[2];

function itemsToMessage(items) {
  return items.map(item => (
    `*$${item.price}* [${item.title}](${item.link})`
  )).join('\n');
}

const scraper = new AmazonListScraper();

scraper.scrape(listUrl)
  .then((items) => {
    const textMessage = `Yo! There are *${items.length}* items in your list:\n${itemsToMessage(items)}`;

    const postData = querystring.stringify({
      chat_id: chatId,
      text: textMessage,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const request = https.request(options, (res) => {
      console.log(`Finished send Telegram message with status code: ${res.statusCode}`);
      res.setEncoding('utf8');
    });

    request.on('error', (e) => {
      console.error(`Could not send message to Telegram: ${e.message}`);
    });

    request.write(postData);
    request.end();
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
