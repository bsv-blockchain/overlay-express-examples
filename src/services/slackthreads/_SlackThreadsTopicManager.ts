import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Signature, Transaction, PushDrop, Utils, OP } from '@bsv/sdk'
import docs from './_SlackThreadsTopicDocs.js'

export default class SlackThreadsTopicManager implements TopicManager {
  /**
   * Identify which outputs in the supplied transaction are admissible.
   *
   * @param beef          Raw transaction encoded in BEEF format.
   * @param previousCoins Previously‑retained coins (unused by this protocol).
   */
  async identifyAdmissibleOutputs(
    beef: number[],
    previousCoins: number[]
  ): Promise<AdmittanceInstructions> {
    const outputsToAdmit: number[] = []

    try {
      const parsedTx = Transaction.fromBEEF(beef)

      if (!Array.isArray(parsedTx.outputs) || parsedTx.outputs.length === 0) {
        throw new Error('Missing parameter: outputs')
      }

      // Inspect every output
      for (const [index, output] of parsedTx.outputs.entries()) {
        try {
          if (output.lockingScript.chunks.length !== 3) throw new Error('Invalid locking script')
          if (output.lockingScript.chunks[0].op !== OP.OP_SHA256) throw new Error('Invalid locking script')
          if (output.lockingScript.chunks[1].op !== 32) throw new Error('Invalid locking script')
          if (output.lockingScript.chunks[2].op !== OP.OP_EQUAL) throw new Error('Invalid locking script')

          outputsToAdmit.push(index)
        } catch (err) {
          console.error(`Error processing output ${index}:`, err)
          // Continue with next output
        }
      }

      if (outputsToAdmit.length === 0) {
        throw new Error('SlackThreads topic manager: no outputs admitted!')
      }

      console.log(`Admitted ${outputsToAdmit.length} SlackThreads ${outputsToAdmit.length === 1 ? 'output' : 'outputs'}!`)
    } catch (err) {
      if (outputsToAdmit.length === 0 && (!previousCoins || previousCoins.length === 0)) {
        console.error('Error identifying admissible outputs:', err)
      }
    }

    // The SlackThreads protocol never retains previous coins
    return {
      outputsToAdmit,
      coinsToRetain: []
    }
  }

  /**
   * Get the documentation associated with this topic manager
   * @returns A promise that resolves to a string containing the documentation
   */
  async getDocumentation(): Promise<string> {
    return docs
  }

  /**
   * Get metadata about the topic manager
   * @returns A promise that resolves to an object containing metadata
   */
  async getMetaData(): Promise<{
    name: string
    shortDescription: string
    iconURL?: string
    version?: string
    informationURL?: string
  }> {
    return {
      name: 'SlackThreads Topic Manager',
      shortDescription: "Saves hashes of slack threads"
    }
  }
}
