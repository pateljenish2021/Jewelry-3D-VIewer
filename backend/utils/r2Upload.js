import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

let s3Client = null;

// Lazy initialization of S3Client
const getS3Client = () => {
  if (s3Client) return s3Client;
  
  // Directly set credentials from removed .env
  s3Client = new S3Client({
    region: 'auto',
    credentials: {
      accessKeyId: 'b6bc7445ffc4c1aaeb09f4b5a59de0e3',
      secretAccessKey: 'f7f37bae916be0a5a56e33d3efb8c3780157b44a636fce7ffc570e62bb385532',
    },
    endpoint: `https://eeedfc1d9b5cfa268065ce3f6dab8bc6.r2.cloudflarestorage.com`,
  });
  
  return s3Client;
};

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type of file
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadToR2 = async (fileBuffer, originalName, mimeType) => {
  try {
    const client = getS3Client(); // Initialize client here
    const fileName = `${uuidv4()}-${Date.now()}-${originalName}`;

    const command = new PutObjectCommand({
      Bucket: 'viewer',
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await client.send(command);

    const publicUrl = `https://pub-3687ff66cb434ea2915e23257bbaca45.r2.dev/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to R2:', error?.message || error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Delete a file from Cloudflare R2
 * @param {string} fileUrl - Full URL of file to delete
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export const deleteFromR2 = async (fileUrl) => {
  try {
    const client = getS3Client(); // Initialize client here
    // Extract filename from URL
    const fileName = fileUrl.split('/').pop();

    const command = new DeleteObjectCommand({
      Bucket: 'viewer',
      Key: fileName,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error?.message || error);
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
};

export default { uploadToR2, deleteFromR2 };
