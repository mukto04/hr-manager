import { MongoClient } from 'mongodb';

// আপনার সুপার এডমিনে দেওয়া ইউআরএলটি এখানে দিন (আমি উদাহরণ দিচ্ছি আপনার আগের ইউআরএল থেকে)
const URI = "mongodb+srv://muktoarifin_db_user:oJGxEnlKp9mkojih@appdevsuk.wcnriaz.mongodb.net/?appName=AppdevsUK";

async function scoutData() {
  const client = new MongoClient(URI);
  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    console.log("✓ Connected! Checking all databases...\n");

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    console.log("Found Databases:");
    console.log("-----------------------------------------");
    
    for (const dbInfo of databases) {
      const db = client.db(dbInfo.name);
      
      // আমরা 'employees' বা 'Employee' কালেকশন খুঁজছি
      const collections = await db.listCollections().toArray();
      const employeeColl = collections.find(c => c.name.toLowerCase() === 'employee' || c.name.toLowerCase() === 'employees');
      
      if (employeeColl) {
        const count = await db.collection(employeeColl.name).countDocuments();
        console.log(`Database: "${dbInfo.name}" | Found Collection: "${employeeColl.name}" | Data Count: ${count} 🚀`);
      } else {
        console.log(`Database: "${dbInfo.name}" | (No employee data found)`);
      }
    }
    console.log("-----------------------------------------");
    console.log("\nনির্দেশনা: যে ডাটাবেসের নামের পাশে 'Data Count' ১ বা তার বেশি দেখাচ্ছে, সুপার এডমিন প্যানেলে .net/ এর পরে সেই নামটি বসিয়ে দিন।");

  } catch (err: any) {
    console.error("Error identifying data:", err.message);
  } finally {
    await client.close();
  }
}

scoutData();
