import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

let uploadDir = path.resolve("uploads");
try {
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}
} catch (err) {
	// If creating project folder fails (readonly filesystem like /var/task),
	// fallback to system temp directory.
	// eslint-disable-next-line no-console
	console.warn(`upload middleware: cannot use ${uploadDir}, falling back to tmpdir: ${err.message}`);
	uploadDir = path.join(os.tmpdir(), "samagran-uploads");
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname || "");
		const baseName = path.basename(file.originalname || "file", ext);
		const safeBase = baseName.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 50) || "file";
		const uniqueName = `${Date.now()}-${safeBase}${ext || ""}`;
		cb(null, uniqueName);
	},
});

export const upload = multer({ storage });