import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import shiftsRouter from "./shifts";
import clientsRouter from "./clients";
import bookingsRouter from "./bookings";
import invoicesRouter from "./invoices";
import receiptsRouter from "./receipts";
import expensesRouter from "./expenses";
import laborEntriesRouter from "./laborEntries";
import todosRouter from "./todos";
import followupsRouter from "./followups";
import campaignsRouter from "./campaigns";
import checklistRouter from "./checklist";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(shiftsRouter);
router.use(clientsRouter);
router.use(bookingsRouter);
router.use(invoicesRouter);
router.use(receiptsRouter);
router.use(expensesRouter);
router.use(laborEntriesRouter);
router.use(todosRouter);
router.use(followupsRouter);
router.use(campaignsRouter);
router.use(checklistRouter);
router.use(reportsRouter);

export default router;
