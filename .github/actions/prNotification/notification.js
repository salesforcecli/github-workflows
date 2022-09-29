const fetch = async (...args) => await import('node-fetch').then(({default: fetch}) => fetch(...args));

const authorIconUrl = process.env.PULL_REQUEST_AUTHOR_ICON_URL;
const authorName = process.env.PULL_REQUEST_AUTHOR_NAME;
const authorProfileUrl = process.env.PULL_REQUEST_AUTHOR_PROFILE_URL;
const baseBranchName = process.env.PULL_REQUEST_BASE_BRANCH_NAME;
const compareBranchName = process.env.PULL_REQUEST_COMPARE_BRANCH_NAME;
const PRNum = process.env.PULL_REQUEST_NUMBER;
const PRRepo = process.env.PULL_REQUEST_REPO;
const PRTitle = process.env.PULL_REQUEST_TITLE;
const PRUrl = process.env.PULL_REQUEST_URL;
const webhookUrl = process.env.WEBHOOK_URL;

const message = {
    type: 'home',
    blocks: [
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*<${PRUrl}|#${PRNum} ${PRTitle}>*`
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            type: 'section',
            text: {
                type: 'plain_text',
                text: PRRepo
            }
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'plain_text',
                    text: baseBranchName
                },
                {
                    "type": "plain_text",
                    "text": ":arrow_left:",
                    "emoji": true
                },
                {
                    type: 'plain_text',
                    text: compareBranchName
                }
            ]
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: '*Author*'
                },
                {
                    type: 'image',
                    image_url: authorIconUrl,
                    alt_text: 'GitHub Icon'
                },
                {
                    type: 'mrkdwn',
                    text: `<${authorProfileUrl}|${authorName}>`
                }
            ]
        }
    ]
};

if (authorName !== 'SF-CLI-BOT' && authorName !== 'dependabot[bot]') {
    fetch(webhookUrl, {
        method: 'post',
        body: JSON.stringify(message),
        headers: { 'Content-Type': 'application/json' }
    }).then(res => console.log('Successfully notified slack!', `Response: ${JSON.stringify(message, null, 4)}`))
    .catch(err => console.log('Encountered an error when attempting to notify slack: ', err, `Message payload: ${JSON.stringify(message, null, 4)}`));
}
