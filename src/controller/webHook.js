import Status from "../model/statusModel.js";
const handleWebhook = async (req, res) => {
  const { reqId, status, prodId } = req.body;

  try {
    // Update the request status in the database
    await Status.updateOne({ requestId:reqId }, { status });

    res.status(200).json({ message: 'Webhook received and processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing webhook.', error });
  }
};

export default handleWebhook;
