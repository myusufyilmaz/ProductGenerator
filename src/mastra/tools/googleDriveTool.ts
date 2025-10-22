import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { google } from "googleapis";

/**
 * Google Drive Tool for Shopify Automation
 * 
 * This tool handles:
 * - Listing folders in Google Drive by ID
 * - Downloading product mockup images
 * - Moving processed folders to "Done" folder
 */

const drive = google.drive("v3");

// Initialize Google Drive with OAuth2 credentials from the connection
async function getGoogleDriveClient() {
  const oauth2Client = new google.auth.OAuth2();
  
  // Get access token from Google Drive connection
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("Google Drive connection not found");
  }

  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-drive`,
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  );

  const resJson = await res.json();
  const connectionSettings = resJson?.items?.[0];
  
  if (!connectionSettings || !connectionSettings.settings.access_token) {
    throw new Error(`Google Drive not connected: ${JSON.stringify(resJson)}`);
  }

  oauth2Client.setCredentials({
    access_token: connectionSettings.settings.access_token,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * List subfolders in a specific Google Drive folder by ID
 */
export const listDriveFoldersTool = createTool({
  id: "list-drive-folders",
  description: "Lists all subfolders in a specific Google Drive folder by folder ID",
  
  inputSchema: z.object({
    folder_id: z.string().describe("Google Drive folder ID to scan"),
    folder_name: z.string().optional().describe("Folder name for logging (optional)"),
  }),
  
  outputSchema: z.object({
    folders: z.array(z.object({
      id: z.string(),
      name: z.string(),
      path: z.string(),
    })),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📁 [GoogleDrive] Listing subfolders', { 
      folder_id: context.folder_id,
      folder_name: context.folder_name 
    });
    
    try {
      const drive = await getGoogleDriveClient();
      
      // List all subfolders in the specified folder
      const response = await drive.files.list({
        q: `'${context.folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'createdTime',
        spaces: 'drive',
      });

      const folders = response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        path: `${context.folder_name || 'folder'}/${file.name}`,
      })) || [];

      logger?.info('✅ [GoogleDrive] Found subfolders', { count: folders.length });
      return { folders };
      
    } catch (error) {
      logger?.error('❌ [GoogleDrive] Error listing folders', { error });
      throw error;
    }
  },
});

/**
 * Download images from a Google Drive folder
 */
export const downloadFolderImagesTool = createTool({
  id: "download-folder-images",
  description: "Downloads all images from a specific Google Drive folder",
  
  inputSchema: z.object({
    folder_id: z.string().describe("Google Drive folder ID"),
    folder_name: z.string().describe("Folder name for logging"),
  }),
  
  outputSchema: z.object({
    images: z.array(z.object({
      name: z.string(),
      content: z.string().describe("Base64 encoded image content"),
      mime_type: z.string(),
    })),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🖼️ [GoogleDrive] Downloading images', { folder_id: context.folder_id, folder_name: context.folder_name });
    
    try {
      const drive = await getGoogleDriveClient();
      
      // List all images in the folder
      const response = await drive.files.list({
        q: `'${context.folder_id}' in parents and (mimeType contains 'image/') and trashed=false`,
        fields: 'files(id, name, mimeType)',
        spaces: 'drive',
      });

      const images = [];
      
      for (const file of response.data.files || []) {
        logger?.info('📥 [GoogleDrive] Downloading image', { name: file.name });
        
        const imageResponse = await drive.files.get(
          { fileId: file.id!, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        
        const base64Content = Buffer.from(imageResponse.data as ArrayBuffer).toString('base64');
        
        images.push({
          name: file.name!,
          content: base64Content,
          mime_type: file.mimeType!,
        });
      }

      logger?.info('✅ [GoogleDrive] Downloaded images', { count: images.length });
      return { images };
      
    } catch (error) {
      logger?.error('❌ [GoogleDrive] Error downloading images', { error });
      throw error;
    }
  },
});

/**
 * Move a folder to "Done" folder after processing
 */
export const moveFolderToDoneTool = createTool({
  id: "move-folder-to-done",
  description: "Moves a processed folder to the 'Done' folder in Google Drive",
  
  inputSchema: z.object({
    folder_id: z.string().describe("Google Drive folder ID to move"),
    folder_name: z.string().describe("Folder name for logging"),
    parent_folder_id: z.string().describe("Parent folder ID (DTF or POD folder)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    new_location: z.string(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📦 [GoogleDrive] Moving folder to Done', { folder_name: context.folder_name });
    
    try {
      const drive = await getGoogleDriveClient();
      
      // Check if "Done" folder exists in parent
      const doneSearch = await drive.files.list({
        q: `name='Done' and '${context.parent_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
      });

      let doneFolderId: string;
      
      if (doneSearch.data.files && doneSearch.data.files.length > 0) {
        doneFolderId = doneSearch.data.files[0].id!;
        logger?.info('📂 [GoogleDrive] Found existing Done folder', { id: doneFolderId });
      } else {
        // Create "Done" folder
        const newFolder = await drive.files.create({
          requestBody: {
            name: 'Done',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [context.parent_folder_id],
          },
          fields: 'id',
        });
        
        doneFolderId = newFolder.data.id!;
        logger?.info('📂 [GoogleDrive] Created Done folder', { id: doneFolderId });
      }

      // Move the folder
      await drive.files.update({
        fileId: context.folder_id,
        addParents: doneFolderId,
        removeParents: context.parent_folder_id,
        fields: 'id, parents',
      });

      logger?.info('✅ [GoogleDrive] Folder moved to Done', { 
        folder_name: context.folder_name,
        done_folder_id: doneFolderId,
      });

      return {
        success: true,
        new_location: `Done/${context.folder_name}`,
      };
      
    } catch (error) {
      logger?.error('❌ [GoogleDrive] Error moving folder', { error });
      throw error;
    }
  },
});
