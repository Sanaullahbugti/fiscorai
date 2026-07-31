import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.js";
import { dataController } from "./data.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = Router();

router.post("/upload-csv", authMiddleware, upload.single("file"), dataController.uploadCsv);
router.get("/user-files", authMiddleware, dataController.userFiles);
router.post("/get-processed-json", authMiddleware, dataController.getProcessedJson);
router.post("/download-file", authMiddleware, dataController.downloadFile);

export default router;
