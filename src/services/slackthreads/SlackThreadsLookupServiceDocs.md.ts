export default `
# SlackThread Lookup Service Documentation

The **SlackThread Lookup Service** (service ID: \`ls_slackthreads\`) lets clients search the on-chain *SlackThread* messages that are indexed by the **SlackThread Topic Manager**. Each record represents a Pay-to-Push-Drop output whose single field is a UTF-8 message of at least two characters.

## Example
\`\`\`typescript
import { LookupResolver } from '@bsv/sdk'

const overlay = new LookupResolver()

const response = await overlay.query({ 
    service: 'ls_slackthreads', 
    query: {
        threadHash: 'some 32 byte hash of a thread'
    } 
}, 10000)
\`\`\`
`
