import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Signature, Transaction, PushDrop, Utils, Script } from '@bsv/sdk'
import docs from './FractionalizeTopicDocs.js'
import { OP } from '@bsv/sdk'

/**
 * Topic manager for the simple "Fractionalize" messaging protocol.
 *
 * Each valid output must satisfy the following rules:
 * 1. There are no rules.
 */
export default class FractionalizeTopicManager implements TopicManager {
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
      console.log('Fractionalize topic manager invoked')
      const parsedTx = Transaction.fromBEEF(beef)

      if (!Array.isArray(parsedTx.outputs) || parsedTx.outputs.length === 0) {
        throw new Error('Missing parameter: outputs')
      }

      // Check each output's lockingScript and verify the format
      for (const [index, output] of parsedTx.outputs.entries()) {
        const chunks = output.lockingScript?.chunks ?? []

        // Check output type
        const isOrdinal = !!chunks.find(chunk => chunk.op === OP.OP_IF);
        const isMultiSig = !!chunks.find(chunk => chunk.op === OP.OP_CHECKMULTISIG);

        // If both true this is an ordinal token mint or server change output
        if (isOrdinal && isMultiSig) {
          const result = checkScriptFormat(output.lockingScript, "server-token")
          console.log("[FractionalizeTopicManager] Server token output detected, result: ", result.message)
          if (result.valid) {
            outputsToAdmit.push(index)
          }
        }

        // If only ordinal is true this is a token transfer to a user
        if (isOrdinal && !isMultiSig) {
          const result = checkScriptFormat(output.lockingScript, "transfer-token")
          console.log("[FractionalizeTopicManager] Server transfer token output detected, result: ", result.message)
          if (result.valid) {
            outputsToAdmit.push(index)
          }
        }

        // If only multisig is true this is a payment output
        if (isMultiSig && !isOrdinal) {
          const result = checkScriptFormat(output.lockingScript, "payment")
          console.log("[FractionalizeTopicManager] Server payment output detected, result: ", result.message)
          if (result.valid) {
            outputsToAdmit.push(index)
          }
        }
      }

      if (outputsToAdmit.length === 0) {
        throw new Error('Fractionalize topic manager: no outputs admitted!')
      }

    } catch (err) {
      if (outputsToAdmit.length === 0 && (!previousCoins || previousCoins.length === 0)) {
        console.error('Error identifying admissible outputs:', err)
      }
    }

    // The Fractionalize protocol never retains previous coins
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
      name: 'Fractionalize Topic Manager',
      shortDescription: "Fractionalize topic manager for the fractionalized ownership PoC"
    }
  }
}

const TEMPLATES = {
  // Script hexstrings for each type (gotten from scriptHex function below)
  "server-token": "00630300000000000000000000000000000000000000005112000000000000000000000000000000000000000000240000000000000000000000000000000000000000686e7ea9140000000000000000000000000000000000000000886b6b516c6c52ae6a200000000000000000000000000000000000000000",
  "transfer-token": "006303000000000000000000000000000000000000000051120000000000000000000000000000000000000000002400000000000000000000000000000000000000006876a914000000000000000000000000000000000000000088ac6a200000000000000000000000000000000000000000",
  "payment": "6e7ea9140000000000000000000000000000000000000000886b6b516c6c52ae"
}
const NORMALIZED_TEMPLATES = {
  "server-token": Script.fromHex(TEMPLATES["server-token"]).toASM(),
  "transfer-token": Script.fromHex(TEMPLATES["transfer-token"]).toASM(),
  "payment": Script.fromHex(TEMPLATES["payment"]).toASM()
};

function checkScriptFormat(script: Script, type: "server-token" | "transfer-token" | "payment") {
  const inputScript = Script.fromHex(script.toHex())

  // Blank out the data fields to leave us with a standard template
  inputScript.chunks.forEach(chunk => {
    if (chunk.data && Utils.toHex(chunk.data) !== Utils.toHex([33])) {
      chunk.data = Array(20).fill(0)
    }
  });

  // Check if the script matches the template
  // Normalize scripts to ASM to handle pushdata code differences
  const isValid = inputScript.toASM() === NORMALIZED_TEMPLATES[type];

  return {
    valid: isValid,
    message: isValid ? 'Script is valid' : 'Script is invalid'
  }
}