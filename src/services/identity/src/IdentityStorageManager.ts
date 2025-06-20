import { Collection, Db } from 'mongodb'
import { IdentityAttributes, IdentityRecord, UTXOReference } from './types.js'
import { Base64String, Certificate, PubKeyHex } from '@bsv/sdk'

interface Query {
  $and: Array<{ [key: string]: any }>
}

// Implements a Lookup Storage Manager for Identity key registry
export class IdentityStorageManager {
  private readonly records: Collection<IdentityRecord>

  /**
   * Constructs a new IdentityStorage instance
   * @param {Db} db - connected mongo database instance
   */
  constructor(private readonly db: Db) {
    this.records = db.collection<IdentityRecord>('identityRecords')
    this.records.createIndex({
      searchableAttributes: 'text'
    }).catch((e) => console.error(e))
  }

  /**
   * Stores record of certification
   * @param {string} txid transaction id
   * @param {number} outputIndex index of the UTXO
   * @param {Certificate} certificate certificate record to store
   */
  async storeRecord(txid: string, outputIndex: number, certificate: Certificate): Promise<void> {
    // Insert new record
    await this.records.insertOne({
      txid,
      outputIndex,
      certificate,
      createdAt: new Date(),
      searchableAttributes: Object.entries(certificate.fields)
        .filter(([key]) => key !== 'profilePhoto' && key !== 'icon')
        .map(([, value]) => value)
        .join(' ')
    })
  }

  /**
   * Delete a matching Identity record
   * @param {string} txid transaction id
   * @param {number} outputIndex index of the UTXO
   */
  async deleteRecord(txid: string, outputIndex: number): Promise<void> {
    await this.records.deleteOne({ txid, outputIndex })
  }

  // Helper function to convert a string into a regex pattern for fuzzy search
  private getFuzzyRegex(input: string): RegExp {
    const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escapedInput.split('').join('.*'), 'i')
  }

  /**
   * Find one or more matching records by attribute
   * @param {IdentityAttributes} attributes certified attributes to query by
   * @param {PubKeyHex[]} [certifiers] acceptable identity certifiers
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  async findByAttribute(attributes: IdentityAttributes, certifiers?: string[]): Promise<UTXOReference[]> {
    // Make sure valid query attributes are provided
    if (attributes === undefined || Object.keys(attributes).length === 0) {
      return []
    }

    // Initialize the query with certifier filter
    const query: Query = {
      $and: [
        { 'certificate.certifier': { $in: certifiers } }
      ]
    }

    if ('any' in attributes) {
      // Apply the getFuzzyRegex method directly to the 'any' search term
      const regexQuery = { searchableAttributes: this.getFuzzyRegex(attributes.any) }
      query.$and.push(regexQuery)
    } else {
      // Construct regex queries for specific fields
      const attributeQueries = Object.entries(attributes).map(([key, value]) => ({
        [`certificate.fields.${key}`]: this.getFuzzyRegex(value)
      }))
      query.$and.push(...attributeQueries)
    }

    // Find matching results from the DB
    return await this.findRecordWithQuery(query)
  }

  /**
   * Finds matching records by identity key, and optional certifiers
   * @param {PubKeyHex} identityKey the public identity key to query by
   * @param {PubKeyHex[]} [certifiers] acceptable identity certifiers
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  async findByIdentityKey(identityKey: PubKeyHex, certifiers?: PubKeyHex[]): Promise<UTXOReference[]> {
    // Validate search query param
    if (identityKey === undefined) {
      return []
    }

    // Construct the base query with the identityKey
    const query = {
      'certificate.subject': identityKey
    }

    // If certifiers array is provided and not empty, add the $in query for certifiers
    if (certifiers !== undefined && certifiers.length > 0) {
      (query as any)['certificate.certifier'] = { $in: certifiers }
    }

    // Find matching results from the DB
    return await this.findRecordWithQuery(query)
  }

  /**
   * Find one or more records by matching certifier
   * @param {PubKeyHex[]} certifiers acceptable identity certifiers
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  async findByCertifier(certifiers: PubKeyHex[]): Promise<UTXOReference[]> {
    // Validate search query param
    if (certifiers === undefined || certifiers.length === 0) {
      return []
    }

    // Construct the query to search for any of the certifiers
    const query = {
      'certificate.certifier': { $in: certifiers }
    }

    // Find matching results from the DB
    return await this.findRecordWithQuery(query)
  }

  /**
   * Find one or more records by matching certificate type
   * @param {Base64String[]} certificateTypes acceptable certificate types
   * @param {PubKeyHex} identityKey identity key of the user
   * @param {PubKeyHex[]} certifiers certifier public keys
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  async findByCertificateType(certificateTypes: Base64String[], identityKey: PubKeyHex, certifiers: PubKeyHex[]): Promise<UTXOReference[]> {
    // Validate search query param
    if (certificateTypes === undefined || certificateTypes.length === 0 || identityKey === undefined || certifiers === undefined || certifiers.length === 0) {
      return []
    }

    // Construct the query to search for the certificate type along with identity and certifier filters
    const query = {
      'certificate.subject': identityKey,
      'certificate.certifier': { $in: certifiers },
      'certificate.type': { $in: certificateTypes }
    }

    // Find matching results from the DB
    return await this.findRecordWithQuery(query)
  }

  /**
   * Find one or more records by matching certificate serial number
   * @param {Base64String} serialNumber - Unique certificate serial number to query by
   * @returns {Promise<UTXOReference[]>} - Returns matching UTXO references
   */
  async findByCertificateSerialNumber(serialNumber: Base64String): Promise<UTXOReference[]> {
    // Validate the serial number parameter
    if (serialNumber === undefined || serialNumber === '') {
      return []
    }

    // Construct the query to search for the certificate with the given serial number.
    // This assumes that the certificate object includes a top-level `serialNumber` property.
    const query = {
      'certificate.serialNumber': serialNumber
    }

    // Find matching results from the DB
    return await this.findRecordWithQuery(query)
  }

  /**
   * Helper function for querying from the database
   * @param {object} query
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  private async findRecordWithQuery(query: object): Promise<UTXOReference[]> {
    // Find matching results from the DB
    const results = await this.records.find(query).project({ txid: 1, outputIndex: 1 }).toArray()

    // Convert array of Documents to UTXOReferences
    const parsedResults: UTXOReference[] = results.map(record => ({
      txid: record.txid,
      outputIndex: record.outputIndex
    }))
    return parsedResults
  }
}
