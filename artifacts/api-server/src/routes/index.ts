import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recipesRouter from "./recipes";
import nutritionRouter from "./nutrition";
import authRouter from "./auth";
import foodEntriesRouter from "./food-entries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recipesRouter);
router.use(nutritionRouter);
router.use(authRouter);
router.use(foodEntriesRouter);

export default router;
