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

function checkScriptFormat(script: Script, type: "server-token" | "transfer-token" | "payment") {
    const templates: Record<"server-token" | "transfer-token" | "payment", string> = {
      // Script hexstrings for each type (gotten from scriptHex function below)
      "server-token": "00630300000000000000000000000000000000000000005112000000000000000000000000000000000000000000240000000000000000000000000000000000000000686e7ea9140000000000000000000000000000000000000000886b6b516c6c52ae6a200000000000000000000000000000000000000000",
      "transfer-token": "006303000000000000000000000000000000000000000051120000000000000000000000000000000000000000002400000000000000000000000000000000000000006876a914000000000000000000000000000000000000000088ac6a200000000000000000000000000000000000000000",
      "payment": "6e7ea9140000000000000000000000000000000000000000886b6b516c6c52ae"
    }

    // Blank out the random hash to leave us with a standard template
    script.chunks.forEach(chunk => { 
      if (chunk.data && Utils.toHex(chunk.data) !== Utils.toHex([33])) {
        chunk.data = Array(20).fill(0)
      }
    });

    // Check if the script matches the template
    const isValid = script.toHex() === templates[type];

    return {
        valid: isValid,
        message: isValid ? 'Script is valid' : 'Script is invalid'
    }
}

// The simple function which gets the lockingScript hexstrings for the templates
// const scriptHex = () => {
//   // Payment Script
//   const PaymentScript = new LockingScript();

//   const oneOfTwoHash = Hash.hash160("oneOfTwo", "utf8");
//   const pubKeyHash = Hash.hash160("pubKey", "utf8");
//   const inscription = {
//       p: "bsv-20",
//       op: "mint",
//       amt: "1",
//   };
//   const jsonString = JSON.stringify(inscription);
//   const tokenTxid = "0000000000000000000000000000000000000000000000000000000000000000";

//   PaymentScript
//       .writeOpCode(OP.OP_2DUP)
//       .writeOpCode(OP.OP_CAT)
//       .writeOpCode(OP.OP_HASH160)
//       .writeBin(oneOfTwoHash)
//       .writeOpCode(OP.OP_EQUALVERIFY)
//       .writeOpCode(OP.OP_TOALTSTACK)
//       .writeOpCode(OP.OP_TOALTSTACK)
//       .writeOpCode(OP.OP_1)
//       .writeOpCode(OP.OP_FROMALTSTACK)
//       .writeOpCode(OP.OP_FROMALTSTACK)
//       .writeOpCode(OP.OP_2)
//       .writeOpCode(OP.OP_CHECKMULTISIG);

//   PaymentScript.chunks.forEach(chunk => { 
//       if (chunk.data && Utils.toHex(chunk.data) !== Utils.toHex([33])) {
//         chunk.data = Array(20).fill(0)
//       }
//   });

//   // Ordinal Script
//   const ordinalScript = new LockingScript();

//   ordinalScript
//           // Write inscription
//           .writeOpCode(OP.OP_0)
//           .writeOpCode(OP.OP_IF)
//           .writeBin(Utils.toArray('ord', 'utf8'))
//           .writeOpCode(OP.OP_1)
//           .writeBin(Utils.toArray('application/bsv-20', 'utf8'))
//           .writeOpCode(OP.OP_0)
//           .writeBin(Utils.toArray(jsonString, 'utf8'))
//           .writeOpCode(OP.OP_ENDIF)
//           // Write 1 of 2 multisig lockingScript
//           .writeOpCode(OP.OP_2DUP)
//           .writeOpCode(OP.OP_CAT)
//           .writeOpCode(OP.OP_HASH160)
//           .writeBin(oneOfTwoHash)
//           .writeOpCode(OP.OP_EQUALVERIFY)
//           .writeOpCode(OP.OP_TOALTSTACK)
//           .writeOpCode(OP.OP_TOALTSTACK)
//           .writeOpCode(OP.OP_1)
//           .writeOpCode(OP.OP_FROMALTSTACK)
//           .writeOpCode(OP.OP_FROMALTSTACK)
//           .writeOpCode(OP.OP_2)
//           .writeOpCode(OP.OP_CHECKMULTISIG)
//           .writeOpCode(OP.OP_RETURN)
//           .writeBin(Utils.toArray(tokenTxid, "hex"));

//   ordinalScript.chunks.forEach(chunk => { 
//       if (chunk.data && Utils.toHex(chunk.data) !== Utils.toHex([33])) {
//         chunk.data = Array(20).fill(0)
//       }
//   });

//   // Transfer script
//   const transferScript = new LockingScript();
//   transferScript
//           // Write inscription
//           .writeOpCode(OP.OP_0)
//           .writeOpCode(OP.OP_IF)
//           .writeBin(Utils.toArray('ord', 'utf8'))
//           .writeOpCode(OP.OP_1)
//           .writeBin(Utils.toArray('application/bsv-20', 'utf8'))
//           .writeOpCode(OP.OP_0)
//           .writeBin(Utils.toArray(jsonString, 'utf8'))
//           .writeOpCode(OP.OP_ENDIF)
//           // Write single signature lockingScript
//           .writeOpCode(OP.OP_DUP)
//           .writeOpCode(OP.OP_HASH160)
//           .writeBin(pubKeyHash)
//           .writeOpCode(OP.OP_EQUALVERIFY)
//           .writeOpCode(OP.OP_CHECKSIG)
//           .writeOpCode(OP.OP_RETURN)
//           .writeBin(Utils.toArray(tokenTxid, "hex"));

//   transferScript.chunks.forEach(chunk => { 
//       if (chunk.data && Utils.toHex(chunk.data) !== Utils.toHex([33])) {
//         chunk.data = Array(20).fill(0)
//       }
//   });

//   console.log("Payment Script: ", PaymentScript.toHex());
//   console.log("Ordinal Script: ", ordinalScript.toHex());
//   console.log("Transfer Script: ", transferScript.toHex());
// }