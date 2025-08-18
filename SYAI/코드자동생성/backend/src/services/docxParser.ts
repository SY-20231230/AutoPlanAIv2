import mammoth from "mammoth";
import fs from "fs-extra";

export async function parseDocxToMarkdown(filePath: string): Promise<string> {
	const fileExists = await fs.pathExists(filePath);
	if (!fileExists) throw new Error(`file not found: ${filePath}`);
	const { value } = await mammoth.convertToMarkdown({ path: filePath });
	return value;
}









