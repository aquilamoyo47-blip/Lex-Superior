import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import consultationsRouter from "./consultations";
import libraryRouter from "./library";
import vaultRouter from "./vault";
import documentsRouter from "./documents";
import councilRouter from "./council";
import webhooksRouter from "./webhooks";
import trainingRouter from "./training";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(consultationsRouter);
router.use(libraryRouter);
router.use(vaultRouter);
router.use(documentsRouter);
router.use(councilRouter);
router.use(webhooksRouter);
router.use(trainingRouter);

export default router;
