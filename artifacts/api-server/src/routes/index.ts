import { Router, type IRouter } from "express";
import healthRouter from "./health";
import birthdayRouter from "./birthday";

const router: IRouter = Router();

router.use(healthRouter);
router.use(birthdayRouter);

export default router;
