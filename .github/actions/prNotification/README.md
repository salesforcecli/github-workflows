# Pull Request Notification Action
A github action to notify a webhook about Pull Request events.

Mainly used to notify Slack when Pull Requests are opened.

## Example
You can see an example in this very repo at [`notify-slack-on-pr-open.yaml`](.github/workflows/notify-slack-on-pr-open.yml)

## Usage
Add the following yaml to your github actions workflows folder.
> This uses a Slack Webhook URL but you could use any URL for any 3rd party service.

```yaml
name: Pull Request Slack notification

on:
  pull_request:
    types: [opened, reopened]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Notify Slack on PR open
      env: 
        WEBHOOK_URL : ${{ secrets.SLACK_WEBHOOK_URL }}
        PULL_REQUEST_AUTHOR_ICON_URL : ${{ github.event.pull_request.user.avatar_url }}
        PULL_REQUEST_AUTHOR_NAME : ${{ github.event.pull_request.user.login }}
        PULL_REQUEST_AUTHOR_PROFILE_URL: ${{ github.event.pull_request.user.html_url }}
        PULL_REQUEST_BASE_BRANCH_NAME : ${{ github.event.pull_request.base.ref }}
        PULL_REQUEST_COMPARE_BRANCH_NAME : ${{ github.event.pull_request.head.ref }}
        PULL_REQUEST_NUMBER : ${{ github.event.pull_request.number }}
        PULL_REQUEST_REPO: ${{ github.event.pull_request.head.repo.name }}
        PULL_REQUEST_TITLE : ${{ github.event.pull_request.title }}
        PULL_REQUEST_URL : ${{ github.event.pull_request.html_url }}
      uses: salesforcecli/github-workflows/.github/actions/prNotification@main
```

### Arguments
#### SLACK_WEBHOOK_URL
Set this as a repository or organization secret on Github. You will get the value for this from Slack.

#### PULL_REQUEST_*
These are pulled straight from [Github's API documentation](https://developer.github.com/v3/pulls/).
