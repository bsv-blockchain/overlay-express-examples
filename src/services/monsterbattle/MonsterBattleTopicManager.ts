import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Signature, Transaction, PushDrop, Utils, OP, Script } from '@bsv/sdk'
import docs from './MonsterBattleTopicDocs.js'

export default class MonsterBattleTopicManager implements TopicManager {
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

      const orderLockPrefixHex = "2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000"
      const orderLockSuffixScript = Script.fromHex(orderLockPrefixHex)
      const orderLockASM = orderLockSuffixScript.toASM()

      // Inspect every output
      for (const [index, output] of parsedTx.outputs.entries()) {
        try {
          // Check for Orderlock script format first
          const outputASM = output.lockingScript.toASM()
          if (outputASM.includes(orderLockASM)) {
            // This is an Orderlock script - accept it
            console.log('[MonsterBattle] Orderlock transaction accepted')
            console.log(`[MonsterBattle] ${outputASM}`)
            console.log(`[MonsterBattle] ${orderLockASM}`)
            outputsToAdmit.push(index)
            continue
          }

          console.log('[MonsterBattle] Incoming ordinal transaction')

          // Check for our ordinal script format
          if (output.lockingScript.chunks.length < 14) throw new Error('Invalid locking script error 1')
          if (output.lockingScript.chunks[0].op !== OP.OP_0) throw new Error('Invalid locking script error 2')
          if (output.lockingScript.chunks[1].op !== OP.OP_IF) throw new Error('Invalid locking script error 3')
          if (output.lockingScript.chunks[3].op !== OP.OP_1) throw new Error('Invalid locking script error 4')
          if (output.lockingScript.chunks[5].op !== OP.OP_0) throw new Error('Invalid locking script error 5')
          if (output.lockingScript.chunks[7].op !== OP.OP_ENDIF) throw new Error('Invalid locking script error 6')
          if (output.lockingScript.chunks[8].op !== OP.OP_DUP) throw new Error('Invalid locking script error 7')
          if (output.lockingScript.chunks[9].op !== OP.OP_HASH160) throw new Error('Invalid locking script error 8')
          if (output.lockingScript.chunks[10].op !== 32) throw new Error('Invalid locking script error 9')
          if (output.lockingScript.chunks[11].op !== OP.OP_EQUALVERIFY) throw new Error('Invalid locking script error 10')
          if (output.lockingScript.chunks[12].op !== OP.OP_CHECKSIG) throw new Error('Invalid locking script error 11')
          if (output.lockingScript.chunks[13].op !== OP.OP_RETURN) throw new Error('Invalid locking script error 12')

          console.log(`[MonsterBattle] Ordinal transaction passed checks`)

          outputsToAdmit.push(index)
        } catch (err) {
          console.error(`Error processing output ${index}:`, err)
          // Continue with next output
        }
      }

      if (outputsToAdmit.length === 0) {
        throw new Error('MonsterBattle topic manager: no outputs admitted!')
      }

      console.log(`Admitted ${outputsToAdmit.length} MonsterBattle ${outputsToAdmit.length === 1 ? 'output' : 'outputs'}!`)
    } catch (err) {
      if (outputsToAdmit.length === 0 && (!previousCoins || previousCoins.length === 0)) {
        console.error('Error identifying admissible outputs:', err)
      }
    }

    // The MonsterBattle protocol never retains previous coins
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
      name: 'MonsterBattle Topic Manager',
      shortDescription: "Stores bsv-21 tokens from the MonsterBattle web game"
    }
  }
}
