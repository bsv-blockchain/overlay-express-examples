import OverlayExpress from '@bsv/overlay-express'
import { config } from 'dotenv'
import ProtoMapTopicManager from './services/protomap/ProtoMapTopicManager'
import ProtoMapLookupService from './services/protomap/ProtoMapLookupServiceFactory'
import CertMapTopicManager from './services/certmap/CertMapTopicManager'
import CertMapLookupService from './services/certmap/CertMapLookupServiceFactory'
import BasketMapTopicManager from './services/basketmap/BasketMapTopicManager'
import BasketMapLookupService from './services/basketmap/BasketMapLookupServiceFactory'
import UHRPTopicManager from './services/uhrp/UHRPTopicManager'
import UHRPLookupService from './services/uhrp/UHRPLookupServiceFactory'
import IdentityTopicManager from './services/identity/IdentityTopicManager'
import IdentityLookupService from './services/identity/IdentityLookupServiceFactory'
import MessageBoxTopicManager from './services/message-box/MessageBoxTopicManager'
import MessageBoxLookupService from './services/message-box/MessageBoxLookupService'
import UMPTopicManager from './services/ump/UMPTopicManager'
import UMPLookupService from './services/ump/UMPLookupServiceFactory'


config()

// Hi there! Let's configure Overlay Express!
const main = async () => {

    // We'll make a new server for our overlay node.
    const server = new OverlayExpress(

        // Name your overlay node with a one-word lowercase string
        `infralay`,

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
    
    // Protocols
    server.configureTopicManager('tm_protomap', new ProtoMapTopicManager())
    server.configureLookupServiceWithMongo('lsf_protomap', ProtoMapLookupService)

    // Certificates
    server.configureTopicManager('tm_certmap', new CertMapTopicManager())
    server.configureLookupServiceWithMongo('lsf_certmap', CertMapLookupService)

    // Baskets
    server.configureTopicManager('tm_basketmap', new BasketMapTopicManager())
    server.configureLookupServiceWithMongo('lsf_basketmap', BasketMapLookupService)

    // UHRP
    server.configureTopicManager('tm_uhrp', new UHRPTopicManager())
    server.configureLookupServiceWithMongo('lsf_uhrp', UHRPLookupService)

    // Identity
    server.configureTopicManager('tm_identity', new IdentityTopicManager())
    server.configureLookupServiceWithMongo('lsf_identity', IdentityLookupService)

    // MessageBox
    server.configureTopicManager('tm_messagebox', new MessageBoxTopicManager())
    server.configureLookupServiceWithMongo('lsf_messagebox', MessageBoxLookupService)

    // UMP
    server.configureTopicManager('tm_ump', new UMPTopicManager())
    server.configureLookupServiceWithMongo('lsf_ump', UMPLookupService)

    // For simple local deployments, sync can be disabled.
    server.configureEnableGASPSync(false) // TODO enable once we're sure it's all working

    // Lastly, configure the engine and start the server!
    await server.configureEngine()
    await server.start()
}

// Happy hacking :)
main()