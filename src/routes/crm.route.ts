import { Router } from "express";
import { CRMController } from "../controllers/crm.controller.js";

// Middlewares
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

// Validations
import { 
  createCompanySchema, updateCompanySchema, deleteCompanySchema,
  createContactSchema, updateContactSchema, deleteContactSchema,
  createDealSchema, updateDealSchema, deleteDealSchema, getDealsQuerySchema
} from "../validations/crm.validations.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(authorize); // Ensures workspace access and fetches req.membership

// --- COMPANIES ---
router.post("/companies", validate(createCompanySchema), CRMController.createCompany);
router.get("/companies", CRMController.getCompanies);
router.patch("/companies/:companyId", validate(updateCompanySchema), CRMController.updateCompany);
router.delete("/companies/:companyId", validate(deleteCompanySchema), CRMController.deleteCompany);

// --- CONTACTS ---
router.post("/contacts", validate(createContactSchema), CRMController.createContact);
router.get("/contacts", CRMController.getContacts);
router.patch("/contacts/:contactId", validate(updateContactSchema), CRMController.updateContact);
router.delete("/contacts/:contactId", validate(deleteContactSchema), CRMController.deleteContact);

// --- DEALS ---
router.post("/deals", validate(createDealSchema), CRMController.createDeal);
router.get("/deals", validate(getDealsQuerySchema), CRMController.getDeals);
router.patch("/deals/:dealId", validate(updateDealSchema), CRMController.updateDeal);
router.delete("/deals/:dealId", validate(deleteDealSchema), CRMController.deleteDeal);

export default router;
