import { Response } from "express";
import { Req } from "../types/express.js";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { CRMService } from "../services/crm.service.js";

export const CRMController = {
  // ================= COMPANY =================
  createCompany: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.createCompany(req.params.workspaceId, req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }),

  getCompanies: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.getCompanies(req.params.workspaceId);
    res.json({ success: true, count: data.length, data });
  }),

  updateCompany: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.updateCompany(req.params.companyId!, req.params.workspaceId, req.body);
    res.json({ success: true, data });
  }),

  deleteCompany: asyncHandler(async (req: Req, res: Response) => {
    await CRMService.softDelete("company", req.params.companyId!, req.params.workspaceId, req.user!.id);
    res.json({ success: true, message: "Company deleted successfully" });
  }),

  // ================= CONTACT =================
  createContact: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.createContact(req.params.workspaceId, req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }),

  getContacts: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.getContacts(req.params.workspaceId);
    res.json({ success: true, count: data.length, data });
  }),

  updateContact: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.updateContact(req.params.contactId!, req.params.workspaceId, req.body);
    res.json({ success: true, data });
  }),

  deleteContact: asyncHandler(async (req: Req, res: Response) => {
    await CRMService.softDelete("contact", req.params.contactId!, req.params.workspaceId, req.user!.id);
    res.json({ success: true, message: "Contact deleted successfully" });
  }),

  // ================= DEAL =================
  createDeal: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.createDeal(req.params.workspaceId, req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }),

  getDeals: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.getDeals(req.params.workspaceId, req.query);
    res.json({ success: true, count: data.length, data });
  }),

  updateDeal: asyncHandler(async (req: Req, res: Response) => {
    const data = await CRMService.updateDeal(req.params.dealId!, req.params.workspaceId, req.user!.id, req.body);
    res.json({ success: true, data });
  }),

  deleteDeal: asyncHandler(async (req: Req, res: Response) => {
    await CRMService.softDelete("deal", req.params.dealId!, req.params.workspaceId, req.user!.id);
    res.json({ success: true, message: "Deal deleted successfully" });
  }),
};
