import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const AWS_REGION = process.env.AWS_REGION || 'af-south-1';
const S3_BUCKET = process.env.S3_BUCKET || 'mshasha';

// Uses the default credential chain (env vars, `aws login` session, IAM role)
const s3 = new S3Client({ region: AWS_REGION });

// Upload a buffer and return its public URL (portfolio/* is public-read via bucket policy)
const uploadObject = async (key, body, contentType) => {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));

  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};

export { s3, uploadObject };
export default s3;
