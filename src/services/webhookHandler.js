import Status from "../model/statusModel.js";
import axios from "axios";
class Webhook {
  static async triggerWebhook(webhookUrl, reqId, productId, status) {
 // Replace with your actual webhook URL
    const maxRetries = 5; // Maximum number of retry attempts
    const retryDelay = 2000; // Initial delay between retries (in milliseconds)
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        attempt++;
        await axios.post(webhookUrl, {
          reqId: reqId,
          status: status,
          prodId: productId,
        }, {
          headers: {
            'Content-Type': 'application/json'
            // any other required headers here
          }
        });
        console.log("Webhook triggered successfully on attempt", attempt);
        success = true; // Mark success if the request is successful
      } catch (error) {
        console.error(
          `Failed to trigger webhook on attempt ${attempt}:`,
          error.message
        );

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying in ${delay / 1000} seconds...`);
          await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
        } else {
          console.error("Max retries reached. Failed to trigger webhook.");
        }
      }
    }
  }

  static async handleWebhook(req, res) {
    const { reqId, status, prodId } = req.body;
    console.log(reqId, status, prodId);
    if(!reqId){
      return res.status(400).json({ message: "Request ID is required." });
    }
    if(!status){
      return res.status(400).json({ message: "Status of image processing is required is required." });
    }

    try {
      if(status === "failed"){
        res.status(500).json({ message: "Image processing failed." });
      }
      // Update the request status in the database
      await Status.updateOne({ requestId: reqId }, { status });
      res
        .status(200)
        .json({
          productId: prodId || "",
          message: `Webhook received and processed successfully for requstId: ${reqId}`,
        });
    } catch (error) {
      res.status(500).json({ message: "Error processing webhook." });
    }
  }
}

export default Webhook;
