import api from "@/service/api";
import type { AnyScreen } from '@/registry/screensRegistry.ts'

export interface Px75Panel {
  panelId: number
  userId: number
  username: string
  serial: string
  name: string
  clientMac: string
  panelType: string
  config: PanelConfig | null
}

export interface PanelConfig {
  panelId: number
  screensConfig: AnyScreen[]
}

export interface CreatePanelRequest {
  userId: number
  serial: string
  username: string
  clientMac: string
  name: string
  panelType: string // or an enum of allowed values
}

export interface UpdatePanelDetailsRequest {
  panelType: string
  name: string
  clientMac: string
  serial: string
}

export async function deletePanel(panelId: number): Promise<void> {
  await api.delete(`/panel/${panelId}`)
}

export async function createPanel(payload: CreatePanelRequest): Promise<Px75Panel> {
  const { data } = await api.post<Px75Panel>("/panel/register", payload);
  return data;
}

export async function fetchPanelById(id: number): Promise<Px75Panel> {
  const { data } = await api.get<Px75Panel>(`/panel/${id}`)
  return data
}

export async function savePanelConfig(panelId: number, config: { panelId: number; screensConfig: AnyScreen[] }) {
  // Adjust URL & payload to match your backend
  // Example: PUT /v1/panels/:id/config
  const { data } = await api.post(`/panel/config`, config, { withCredentials: true })
  return data
}

export async function updatePanelDetails(
  panelId: number,
  payload: UpdatePanelDetailsRequest
): Promise<Px75Panel> {
  const { data } = await api.patch<Px75Panel>(`/panel/${panelId}`, payload)
  return data
}

