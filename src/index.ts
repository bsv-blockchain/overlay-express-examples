import OverlayExpress from '@bsv/overlay-express'
import { config } from 'dotenv'
config()

// Hi there! Let's configure Overlay Express!
const main = async () => {

    // We'll make a new server for our overlay node.
    const server = new OverlayExpress(

        // Name your overlay node with a one-word lowercase string
        `testnode`,

        // Provide the private key that gives your node its identity
        process.env.SERVER_PRIVATE_KEY!,

        // Provide the HTTPS URL where your node is available on the internet
        process.env.HOSTING_URL!,
    )

    // Set the ARC API key
    server.configureArcApiKey(process.env.ARC_API_KEY!)

    // Decide what port you want the server to listen on.
    server.configurePort(8080)

    // Connect to your SQL database with Knex
    await server.configureKnex(process.env.KNEX_URL!)

    // Also, be sure to connect to MongoDB
    await server.configureMongo(process.env.MONGO_URL!)

    // Here, you will configure the overlay topic managers and lookup services you want.
    // - Topic managers decide what outputs can go in your overlay
    // - Lookup services help people find things in your overlay
    // - Make use of functions like `configureTopicManager` and `configureLookupServiceWithMongo`
    // ADD YOUR OVERLAY SERVICES HERE

    // For simple local deployments, sync can be disabled.
    server.configureEnableGASPSync(false)

    // Lastly, configure the engine and start the server!
    await server.configureEngine()
    await server.start()
}

// Happy hacking :)
main()