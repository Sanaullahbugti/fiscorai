import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.js";
import { uploadLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";
import { periodSchema } from "./data.dto.js";
import { dataController } from "./data.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = Router();

// validateBody runs after multer so it sees the parsed multipart text fields,
// not the raw stream — rejects a hostile month/quarter/year before it ever
// reaches the filesystem layer.
router.post(
  "/upload-csv",
  authMiddleware,
  uploadLimiter,
  upload.single("file"),
  validateBody(periodSchema),
  dataController.uploadCsv,
);
router.get("/user-files", authMiddleware, dataController.userFiles);
router.get("/overview", authMiddleware, dataController.overview);
router.post(
  "/insights",
  authMiddleware,
  validateBody(periodSchema),
  dataController.insights,
);
router.post(
  "/get-processed-json",
  authMiddleware,
  validateBody(periodSchema),
  dataController.getProcessedJson,
);
router.post(
  "/download-file",
  authMiddleware,
  validateBody(periodSchema),
  dataController.downloadFile,
);

export default router;
