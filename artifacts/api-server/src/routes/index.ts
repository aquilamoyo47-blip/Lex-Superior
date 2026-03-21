import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import consultationsRouter from "./consultations";
import libraryRouter from "./library";
import vaultRouter from "./vault";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(consultationsRouter);
router.use(libraryRouter);
router.use(vaultRouter);
router.use(documentsRouter);

export default router;
