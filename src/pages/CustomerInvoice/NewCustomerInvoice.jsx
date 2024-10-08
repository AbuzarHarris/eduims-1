import { DataTable } from "primereact/datatable"
import { Button } from "primereact/button"
import { Column } from "primereact/column"
import {
  useForm,
  useFieldArray,
  useFormContext,
  FormProvider,
  useWatch,
  Controller,
} from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ActionButtons from "../../components/ActionButtons"
import { FilterMatchMode } from "primereact/api"
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { AuthContext, useAuthProvider } from "../../context/AuthContext"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"

import TextInput from "../../components/Forms/TextInput"
import NumberInput from "../../components/Forms/NumberInput"

import DetailHeaderActionButtons from "../../components/DetailHeaderActionButtons"
import CDropdown from "../../components/Forms/CDropdown"
import {
  addNewCustomerInvoice,
  deleteCustomerInvoiceByID,
  fetchMonthlyMaxCustomerInvoiceNo,
  fetchCustomerInvoiceById,
  fetchAllCustomerInvoices,
  SendCustomerInvoiceEmail,
  SendCustomerInvoiceWAMsg,
  GetCustomerProduct,
} from "../../api/CustomerInvoiceData"
import ButtonToolBar from "../../components/ActionsToolbar"

import {
  getNavigatedFrom,
  MENU_KEYS,
  QUERY_KEYS,
  ROUTE_URLS,
  SELECT_QUERY_KEYS,
} from "../../utils/enums"
import {
  fetchAllBusinessUnitsForSelect,
  fetchAllCustomerAccountsForSelect,
  fetchAllCustomerBranchesData,
  fetchAllOldCustomersForSelect,
  fetchAllProductsForSelect,
  fetchAllServicesForSelect,
  fetchAllSessionsForSelect,
} from "../../api/SelectData"
import CDatePicker from "../../components/Forms/CDatePicker"
import CSwitchInput from "../../components/Forms/CSwitchInput"
import { useUserData } from "../../context/AuthContext"
import { CustomerEntryForm } from "../../components/CustomerEntryFormComponent"
import { ShowErrorToast } from "../../utils/CommonFunctions"
import NewCustomerInvoiceIntallmentsModal from "../../components/Modals/NewCustomerInvoiceInstallmentModal"
import { CustomSpinner } from "../../components/CustomSpinner"
import { useAppConfigurataionProvider } from "../../context/AppConfigurationContext"
import useConfirmationModal from "../../hooks/useConfirmationModalHook"

import { decryptID, encryptID } from "../../utils/crypto"
import { CustomerInvoiceDetailTableRowComponent } from "./CustomerInvoiceDetailTable/BusinessUnitDependantRowFields"
import { TextAreaField } from "../../components/Forms/form"
import { usePrintReportAsPDF } from "../../hooks/CommonHooks/commonhooks"

import { FormRightsWrapper } from "../../components/Wrappers/wrappers"

import {
  FormColumn,
  FormRow,
  FormLabel,
} from "../../components/Layout/LayoutComponents"
import { DetailPageTilteAndActionsComponent } from "../../components"
import { usePreviousAndNextID } from "../../hooks/api/usePreviousAndNextIDHook"
import { DevTool } from "@hookform/devtools"

let parentRoute = ROUTE_URLS.ACCOUNTS.NEW_CUSTOMER_INVOICE
let editRoute = `${parentRoute}/edit/`
let newRoute = `${parentRoute}/new`
let viewRoute = `${parentRoute}/`
let onlineDetailColor = "#365abd"
let queryKey = QUERY_KEYS.CUSTOMER_INVOICE_QUERY_KEY
let IDENTITY = "CustomerInvoiceID"
let MENU_KEY = MENU_KEYS.ACCOUNTS.CUSTOMER_INVOICE_FORM_KEY

export default function Customerinvoice() {
  return (
    <FormRightsWrapper
      FormComponent={CustomerInvoiceFormCompoent}
      DetailComponent={DetailComponent}
      menuKey={MENU_KEY}
      identity={IDENTITY}
    />
  )
}

function DetailComponent({ userRights }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const menuRef = useRef()

  const { showDeleteDialog, showEditDialog } = useConfirmationModal({
    handleDelete,
    handleEdit,
  })
  const { handlePrintReport } = usePrintReportAsPDF()

  const [filters, setFilters] = useState({
    SessionBasedVoucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
    InvoiceNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
    CustomerName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    AccountTitle: { value: null, matchMode: FilterMatchMode.CONTAINS },
    CustomerInvoiceMode: { value: null, matchMode: FilterMatchMode.CONTAINS },
    TotalNetAmount: { value: null, matchMode: FilterMatchMode.CONTAINS },
  })

  const user = useUserData()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey],
    queryFn: () => fetchAllCustomerInvoices(user.userID),
    initialData: [],
    refetchOnWindowFocus: false,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerInvoiceByID,
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      }
    },
  })

  function handleDelete(id) {
    deleteMutation.mutate({ CustomerInvoiceID: id, LoginUserID: user.userID })
  }

  function handleEdit(id) {
    navigate(editRoute + id)
  }

  function handleView(id) {
    navigate(parentRoute + "/" + id)
  }
  const refs = useRef([])

  function handlePrint({ id, report = "simple" }) {
    let ShowParties = method.getValues("ShowParties_" + id)
    if (report !== "simple") {
      handlePrintReport({
        getPrintFromUrl:
          "InvoicePrint?CustomerInvoiceID=" + id + `&ReportType=${report}`,
      })
    } else {
      handlePrintReport({
        getPrintFromUrl: "InvoicePrint?CustomerInvoiceID=" + id,
      })
    }
  }

  const items = [
    {
      label: "Previous Balance Report",
      icon: "pi pi-step-backward",
      command: (id) => {
        handlePrint({ id: id, report: "PreviousBalance" })
      },
    },
  ]

  const method = useForm()

  const onRowClick = (e) => {
    navigate(viewRoute + encryptID(e?.data?.CustomerInvoiceID))
  }

  return (
    <>
      {isLoading || isFetching ? (
        <>
          <CustomSpinner />
        </>
      ) : (
        <>
          <DetailPageTilteAndActionsComponent
            title="Customer Invoices"
            onAddNewClick={() => navigate(newRoute)}
            showAddNewButton={userRights[0]?.RoleNew}
            buttonLabel="Create New Invoice"
          />
          <DataTable
            showGridlines
            value={data}
            dataKey="CustomerInvoiceID"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            removableSort
            emptyMessage="No CustomerInvoices found!"
            filters={filters}
            filterDisplay="row"
            resizableColumns
            size="small"
            selectionMode="single"
            className={"thead"}
            tableStyle={{ minWidth: "50rem" }}
            onRowClick={onRowClick}
          >
            <Column
              body={(rowData) =>
                ActionButtons({
                  ID: encryptID(rowData.CustomerInvoiceID),
                  handleDelete: () =>
                    showDeleteDialog(encryptID(rowData.CustomerInvoiceID)),
                  handleEdit: () =>
                    showEditDialog(encryptID(rowData.CustomerInvoiceID)),
                  handleView: handleView,
                  showEditButton: userRights[0]?.RoleEdit,
                  showDeleteButton: userRights[0]?.RoleDelete,
                  viewBtnRoute:
                    viewRoute + encryptID(rowData.CustomerInvoiceID),
                  showPrintBtn: true,
                  handlePrint: () =>
                    handlePrint({ id: rowData.CustomerInvoiceID }),
                  children: (
                    <>
                      {/* <BootStrapButton
                        size="sm"
                        variant="outline-warning"
                        onClick={() =>
                          handlePrint({
                            id: rowData.CustomerInvoiceID,
                            report: "PreviousBalance",
                          })
                        }
                      >
                        <i className="pi pi-print"></i>
                      </BootStrapButton> */}
                      <Button
                        icon="pi pi-print"
                        severity="warning"
                        size="small"
                        className="rounded"
                        style={{
                          padding: "0.3rem .7rem",
                          fontSize: ".8em",
                          width: "30px",
                        }}
                        type="button"
                        onClick={() =>
                          handlePrint({
                            id: rowData.CustomerInvoiceID,
                            report: "PreviousBalance",
                          })
                        }
                        tooltip="Balance Invoice"
                      />
                      {/* <div className="ml-1">
                        <Controller
                          name={"ShowParties_" + rowData.CustomerInvoiceID}
                          control={method.control}
                          render={({ field }) => (
                            <>
                              <Checkbox
                                inputId={field.name}
                                checked={field.value}
                                inputRef={field.ref}
                                onChange={(e) => {
                                  field.onChange(e.checked)
                                }}
                                defaultChecked={false}
                                defaultValue={false}
                                tooltip="Show Parties"
                              />
                            </>
                          )}
                        />
                      </div> */}
                    </>
                  ),
                })
              }
              header="Actions"
              resizeable={false}
              //    style={{ minWidth: "15rem" }}
            ></Column>
            <Column
              field="SessionBasedVoucherNo"
              filter
              filterPlaceholder="Search by invoice no"
              sortable
              header="Invoice No"
            ></Column>
            <Column
              field="InvoiceNo"
              filter
              filterPlaceholder="Search by ref no"
              sortable
              header="Ref No"
            ></Column>
            <Column field="InvoiceDate" sortable header="Voucher Date"></Column>
            <Column
              field="TotalNetAmount"
              filter
              filterPlaceholder="Search by net amount"
              sortable
              header="Total Net Amount"
            ></Column>

            <Column
              field="CustomerName"
              filter
              filterPlaceholder="Search by customer name"
              sortable
              header="Customer Name"
            ></Column>
            <Column
              field="AccountTitle"
              filter
              filterPlaceholder="Search by customer ledger"
              sortable
              header="Ledger"
            ></Column>
            <Column
              field="DocumentNo"
              filter
              filterPlaceholder="Search by document no"
              sortable
              header="Document No"
            ></Column>
          </DataTable>
        </>
      )}
    </>
  )
}

const defaultValues = {
  SesionID: "",
  BusinessUnitID: "",
  VoucherNo: "",
  DocumentNo: "",
  InvoiceTitle: "",
  SessionBasedVoucherNo: "",
  VoucherDate: new Date(),
  VoucherDueDate: new Date(),
  Description: "",
  Customer: "",
  CustomerLedgers: "",
  CustomerInvoiceDetail: [],
  installments: [],
}

export function CustomerInvoiceFormCompoent({
  mode,
  userRights,
  isPublicRoute = false,
}) {
  document.title = "Customer Invoice"
  const queryClient = useQueryClient()
  const { CustomerInvoiceID } = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [searchParams, setSearchParams] = useSearchParams()
  const queryParams = new URLSearchParams(searchParams)
  const from = queryParams.get("f") ?? ""

  let UserId = isPublicRoute ? 1 : user?.userID
  // Ref
  const detailTableRef = useRef()
  const customerCompRef = useRef()
  const invoiceInstallmentRef = useRef()
  const nullBranchRef = useRef()
  // Form
  const method = useForm({
    defaultValues,
  })

  const { data: PreviousAndNextIDs } = usePreviousAndNextID({
    TableName: "data_CustomerInvoice",
    IDName: IDENTITY,
    LoginUserID: user?.userID,
    RecordID: CustomerInvoiceID,
  })

  function getGoBackRoute() {
    const navigated_from = getNavigatedFrom(from)
    const navigate_from_obj = { ...navigated_from }
    if (from) {
      if (navigated_from) {
        navigate_from_obj.routeUrl = navigated_from.routeUrl
        navigate_from_obj.title = navigated_from.title
      }
    } else {
      navigate_from_obj.routeUrl = parentRoute
      navigate_from_obj.title = "Customer Invoices"
    }

    return navigate_from_obj
  }

  const getRouteConfig = getGoBackRoute()

  const { data: CustomerInvoiceData } = useQuery({
    queryKey: [
      QUERY_KEYS.CUSTOMER_INVOICE_QUERY_KEY,
      {
        CustomerInvoiceID: CustomerInvoiceID,
      },
    ],
    queryFn: () => fetchCustomerInvoiceById(CustomerInvoiceID, UserId),
    enabled: CustomerInvoiceID !== undefined,
    initialData: [],
    refetchOnWindowFocus: false,
  })

  const { data: BusinessUnitSelectData } = useQuery({
    queryKey: [SELECT_QUERY_KEYS.BUSINESS_UNIT_SELECT_QUERY_KEY],
    queryFn: fetchAllBusinessUnitsForSelect,
    initialData: [],
    enabled: mode !== "",
    refetchOnWindowFocus: false,
  })

  const SendEmailMutation = useMutation({
    mutationFn: SendCustomerInvoiceEmail,
  })

  const SendWAMsgMutation = useMutation({
    mutationFn: SendCustomerInvoiceWAMsg,
  })

  const CustomerInvoiceMutation = useMutation({
    mutationFn: addNewCustomerInvoice,
    onSuccess: ({ success, RecordID, Type }) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
        navigate(`${parentRoute}/${RecordID}`)

        SendEmailMutation.mutate({
          LoginUserID: UserId,
          CustomerInvoiceID: decryptID(RecordID),
          Type: Type,
        })

        SendWAMsgMutation.mutate({
          LoginUserID: UserId,
          CustomerInvoiceID: decryptID(RecordID),
          Type: Type,
        })

        if (from !== "") {
          navigate(getRouteConfig.routeUrl)
        }
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomerInvoiceByID,
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      }
    },
  })

  useEffect(() => {
    if (
      Array.isArray(CustomerInvoiceData?.Master) &&
      CustomerInvoiceData?.Master?.length > 0
    ) {
      method.setValue("SessionID", CustomerInvoiceData?.Master[0]?.SessionID)
      method.setValue(
        "BusinessUnitID",
        CustomerInvoiceData?.Master[0]?.BusinessUnitID
      )
      method.setValue("Customer", CustomerInvoiceData?.Master[0]?.CustomerID)
      method.setValue("VoucherNo", CustomerInvoiceData?.Master[0]?.InvoiceNo)
      method.setValue(
        "SessionBasedVoucherNo",
        CustomerInvoiceData?.Master[0]?.InvoiceNo1
      )
      method.setValue(
        "VoucherDate",
        new Date(CustomerInvoiceData?.Master[0]?.InvoiceDate)
      )
      method.setValue(
        "VoucherDueDate",
        new Date(CustomerInvoiceData?.Master[0]?.InvoiceDueDate)
      )
      customerCompRef.current?.setCustomerID(
        CustomerInvoiceData?.Master[0]?.CustomerID
      )
      method.setValue(
        "CustomerLedgers",
        CustomerInvoiceData?.Master[0]?.AccountID
      )

      nullBranchRef.current?.setAccountID(
        CustomerInvoiceData?.Master[0]?.AccountID
      )

      method.setValue(
        "DocumentNo",
        CustomerInvoiceData?.Master[0]?.DocumentNo ?? undefined
      )
      method.setValue(
        "InvoiceTitle",
        CustomerInvoiceData?.Master[0]?.InvoiceTitle
      )
      method.setValue(
        "Description",
        CustomerInvoiceData?.Master[0]?.MasterDescription ?? undefined
      )
      method.setValue(
        "CustomerInvoiceDetail",
        CustomerInvoiceData.Detail?.map((invoice, index) => {
          return {
            InvoiceType: invoice.InvoiceTypeTitle,
            ProductInfoID: invoice.ProductToInvoiceID,
            ServiceInfoID: invoice.ServiceToInvoiceID,
            CustomerBranch: invoice.BranchID,
            BusinessUnitID: invoice.BusinessUnitID,
            Qty: invoice.Quantity,
            ...invoice,
          }
        })
      )
      method.setValue(
        "installments",
        CustomerInvoiceData?.InstallmentDetail.map((item, index) => {
          return {
            IDate: new Date(item.DueDate),
            Amount: item.Amount,
          }
        })
      )

      method.setValue("TotalAmount", CustomerInvoiceData?.Master[0]?.TotalCGS)
      method.setValue(
        "TotalNetAmount",
        CustomerInvoiceData?.Master[0]?.TotalNetAmount
      )
      method.setValue(
        "TotalDiscount",
        CustomerInvoiceData?.Master[0]?.TotalDiscount
      )
      method.setValue("TotalRate", CustomerInvoiceData?.Master[0]?.TotalRate)
    }
  }, [CustomerInvoiceID, CustomerInvoiceData])

  function handleEdit() {
    navigate(`${editRoute}${CustomerInvoiceID}`)
  }

  function handleAddNew() {
    method.reset()
    navigate(newRoute)
  }

  function handleCancel() {
    if (mode === "new") {
      navigate(parentRoute)
    } else if (mode === "edit") {
      navigate(`${parentRoute}/${CustomerInvoiceID}`)
    }
  }

  function handleDelete() {
    deleteMutation.mutate({
      CustomerInvoiceID: CustomerInvoiceID,
      LoginUserID: UserId,
    })
    navigate(parentRoute)
  }

  function onSubmit(data) {
    try {
      const isValid = validateData(data)
      if (isValid == true) {
        if (data?.CustomerInvoiceDetail.length > 0) {
          if (data.TotalNetAmount !== 0) {
            CustomerInvoiceMutation.mutate({
              formData: data,
              userID: UserId,
              CustomerInvoiceID: CustomerInvoiceID,
            })
          } else {
            ShowErrorToast("Total Invoice Amount must be greater than 0!")
          }
        } else {
          ShowErrorToast("Please add atleast 1 row!")
        }
      } else {
        ShowErrorToast("Please add atleast 1 row!")
      }
    } catch (error) {
      console.error(error)
      ShowErrorToast(error.message)
    }
  }

  function validateData(data) {
    let success = true
    const InstallmentTotalRemaining = getInstallmentTotal()

    if (InstallmentTotalRemaining.total === 0) {
      success == true
    } else if (InstallmentTotalRemaining.calculatedAmount < 0) {
      ShowErrorToast("Installment Amounts cannot exceed Total Net Amount!")
      success = false
    } else if (InstallmentTotalRemaining.calculatedAmount > 0) {
      ShowErrorToast("Installment Amounts must be equal to Total Net Amount!")
      success = false
    }

    return success
  }

  function getInstallmentTotal() {
    let total = 0
    const totalNetAmount = parseFloat(0 + method.getValues("TotalNetAmount"))
    const installments = method.getValues("installments") ?? []

    if (Array.isArray(installments) && installments.length > 0) {
      for (let i = 0; i < installments.length; i++) {
        total += parseFloat(installments[i].Amount || "0")
      }
    }

    return { calculatedAmount: totalNetAmount - total, total }
  }

  return (
    <>
      {isLoading ? (
        <>
          <CustomSpinner />
        </>
      ) : (
        <>
          <CustomerBranchDataProvider>
            <CustomerInvoiceToolbar
              mode={mode}
              handleGoBack={() => {
                navigate(getRouteConfig.routeUrl)
              }}
              handleCancel={() => {
                handleCancel()
              }}
              handleEdit={() => handleEdit()}
              handleAddNew={() => {
                handleAddNew()
              }}
              method={method}
              handleSave={() => method.handleSubmit(onSubmit)()}
              saveLoading={CustomerInvoiceMutation.isPending}
              handleDelete={handleDelete}
              userRights={userRights}
              CustomerInvoiceID={CustomerInvoiceID}
              PreviousAndNextIDs={PreviousAndNextIDs}
              handlePrevious={() =>
                navigate(
                  `${parentRoute}/${PreviousAndNextIDs.PreviousRecordID}`
                )
              }
              handleNext={() =>
                navigate(`${parentRoute}/${PreviousAndNextIDs.NextRecordID}`)
              }
              isPublic={isPublicRoute}
              currentRecordId={CustomerInvoiceID}
              handleFirstRecord={() => {
                navigate(`${parentRoute}/${PreviousAndNextIDs.FirstRecordID}`)
              }}
              handleLastRecord={() => {
                navigate(`${parentRoute}/${PreviousAndNextIDs.LastRecordID}`)
              }}
              GoBackLabel={getRouteConfig.title}
            />
            <form id="CustomerInvoice" className="mt-4">
              <FormProvider {...method}>
                <FormRow>
                  <SessionSelect mode={mode} />
                  <BusinessUnitDependantFields mode={mode} />
                </FormRow>
                <FormRow>
                  <FormColumn lg={2} xl={2} md={6}>
                    <FormLabel>Invoice Date</FormLabel>
                    <div>
                      <CDatePicker
                        control={method.control}
                        name="VoucherDate"
                        disabled={mode === "view"}
                      />
                    </div>
                  </FormColumn>
                  <FormColumn lg={2} xl={2} md={6}>
                    <FormLabel>
                      Invoice Due Date
                      {!isPublicRoute && (
                        <>
                          <Button
                            tooltip="Installments"
                            icon="pi pi-money-bill"
                            severity="primary"
                            size="small"
                            className="rounded-2"
                            type="button"
                            onClick={() =>
                              invoiceInstallmentRef.current?.openDialog(true)
                            }
                            style={{
                              padding: "1px 0px",
                              fontSize: "small",
                              width: "30px",
                              marginLeft: "10px",
                            }}
                          />
                        </>
                      )}
                    </FormLabel>
                    <div>
                      <CDatePicker
                        control={method.control}
                        name="VoucherDueDate"
                        disabled={mode === "view"}
                      />
                    </div>
                  </FormColumn>

                  <CustomerDependentFields
                    mode={mode}
                    removeAllRows={detailTableRef.current?.removeAllRows}
                    ref={customerCompRef}
                  />
                </FormRow>
                <FormRow>
                  <FormColumn lg={3} xl={3} md={6}>
                    <FormLabel>Invoice Title</FormLabel>
                    <div>
                      <TextInput
                        control={method.control}
                        ID={"InvoiceTitle"}
                        isEnable={mode !== "view"}
                        focusOptions={() => method.setFocus("Description")}
                      />
                    </div>
                  </FormColumn>

                  <FormColumn lg={9} xl={9} md={6}>
                    <FormLabel>Description</FormLabel>
                    <div>
                      <TextAreaField
                        control={method.control}
                        name={"Description"}
                        autoResize={true}
                        disabled={mode === "view"}
                      />
                    </div>
                  </FormColumn>
                </FormRow>
              </FormProvider>
            </form>
            <NullBranchContext ref={nullBranchRef} />
            {mode !== "view" && (
              <>
                <div className="shadow p-2 mt-2">
                  <CustomerInvoiceDetailHeaderForm
                    appendSingleRow={detailTableRef.current?.appendSingleRow}
                  />
                </div>
              </>
            )}

            <FormProvider {...method}>
              <CustomerInvoiceDetailTable
                mode={mode}
                BusinessUnitSelectData={BusinessUnitSelectData}
                CustomerBranchSelectData={[]}
                ref={detailTableRef}
              />
            </FormProvider>
            <hr />
            <FormProvider {...method}>
              <CustomerInvoiceDetailTotal />
            </FormProvider>
            <FormRow>
              <FormColumn lg={3} xl={3} md={6}>
                <FormLabel>Total Amount</FormLabel>

                <div>
                  <NumberInput
                    control={method.control}
                    id={"TotalRate"}
                    disabled={true}
                  />
                </div>
              </FormColumn>
              <FormColumn lg={3} xl={3} md={6}>
                <FormLabel>Total CGS</FormLabel>
                <div>
                  <NumberInput
                    control={method.control}
                    id={"TotalAmount"}
                    disabled={true}
                  />
                </div>
              </FormColumn>
              <FormColumn lg={3} xl={3} md={6}>
                <FormLabel>Total Discount</FormLabel>

                <div>
                  <NumberInput
                    control={method.control}
                    id={"TotalDiscount"}
                    disabled={true}
                  />
                </div>
              </FormColumn>
              <FormColumn lg={3} xl={3} md={6}>
                <FormLabel>Total Net Amount</FormLabel>

                <div>
                  <NumberInput
                    control={method.control}
                    id={"TotalNetAmount"}
                    disabled={true}
                  />
                </div>
              </FormColumn>
            </FormRow>
            <FormProvider {...method}>
              <NewCustomerInvoiceIntallmentsModal
                mode={mode}
                ref={invoiceInstallmentRef}
              />
            </FormProvider>
          </CustomerBranchDataProvider>
        </>
      )}
    </>
  )
}

function CustomerInvoiceToolbar({
  mode,
  handleGoBack,
  handleCancel,
  handleAddNew,
  handleSave,
  method,
  saveLoaing,
  handleDelete,
  userRights,
  CustomerInvoiceID,
  handleEdit,
  handleNext,
  handlePrevious,
  PreviousAndNextIDs,
  handleFirstRecord,
  handleLastRecord,
  currentRecordId,
  isPublic,
  GoBackLabel,
}) {
  const [printQueryParams, setPrintQueryParams] = useState(
    `InvoicePrint?CustomerInvoiceID=${decryptID(CustomerInvoiceID)}`
  )

  useEffect(() => {
    setPrintQueryParams(
      `InvoicePrint?CustomerInvoiceID=${decryptID(CustomerInvoiceID)}`
    )
  }, [CustomerInvoiceID])

  return (
    <div className="mt-4">
      <ButtonToolBar
        mode={mode}
        handleGoBack={handleGoBack}
        handleEdit={handleEdit}
        handleCancel={handleCancel}
        handleAddNew={handleAddNew}
        handleSave={handleSave}
        GoBackLabel={GoBackLabel}
        saveLoading={saveLoaing}
        handleDelete={handleDelete}
        showAddNewButton={userRights[0]?.RoleNew}
        showEditButton={userRights[0]?.RoleEdit}
        showDelete={userRights[0]?.RoleDelete}
        showPrint={mode === "view" && userRights[0]?.RolePrint && !isPublic}
        printDisable={mode !== "view"}
        getPrintFromUrl={mode !== "new" && printQueryParams}
        splitButtonItems={[
          {
            label: "Previous Balance Report",
            icon: "pi pi-step-backward",
            reportType: "PreviousBalance",
          },
        ]}
        showUtilityContent={mode === "view"}
        PreviousAndNextIDs={PreviousAndNextIDs}
        handlePrevious={handlePrevious}
        handleNext={handleNext}
        handleFirstRecord={handleFirstRecord}
        handleLastRecord={handleLastRecord}
        currentRecordId={currentRecordId}
        showPreviousButton={!isPublic}
        showSaveButton={!isPublic}
        showCancelButton={!isPublic}
        showNextButton={!isPublic}
        showDeleteButton={!isPublic}
        showBackButton={!isPublic}
        showSeparator={!isPublic}
        showFirstRecordButton={!isPublic}
        showLastRecordButton={!isPublic}

        // utilityContent={
        //   <>
        //     <div>
        //       <CheckBox
        //         control={method.control}
        //         ID={"ShowParties"}
        //         Label={"Show Parties"}
        //         isEnable={mode === "view"}
        //         onChange={(e) => {
        //           if (e.checked) {
        //             setPrintQueryParams(
        //               `InvoicePrint?CustomerInvoiceID=${decryptID(CustomerInvoiceID)}&ShowPartyBalance=true`
        //             )
        //           } else {
        //             setPrintQueryParams(
        //               `InvoicePrint?CustomerInvoiceID=${decryptID(CustomerInvoiceID)}`
        //             )
        //           }
        //         }}
        //       />
        //     </div>
        //   </>
        // }
      />
    </div>
  )
}

// New Master Fields
function SessionSelect({ mode }) {
  const { data } = useQuery({
    queryKey: [SELECT_QUERY_KEYS.SESSION_SELECT_QUERY_KEY],
    queryFn: fetchAllSessionsForSelect,
    // Caching data for 10 mins
    refetchOnWindowFocus: false,
    staleTime: 600000,
    refetchInterval: 600000,
  })

  const method = useFormContext()

  useEffect(() => {
    if (data && data.length > 0 && mode === "new") {
      method.setValue("SessionID", data[0]?.SessionID)
    }
  }, [data, mode])

  return (
    <>
      <FormColumn className="col-xl-3" lg={3} xl={3} md={6}>
        <FormLabel style={{ fontSize: "14px", fontWeight: "bold" }}>
          Session
          <span className="text-red-700 fw-bold ">*</span>
        </FormLabel>
        <div>
          <CDropdown
            control={method.control}
            name={`SessionID`}
            optionLabel="SessionTitle"
            optionValue="SessionID"
            placeholder="Select a session"
            options={data}
            required={true}
            filter={false}
            disabled={mode === "view"}
            focusOptions={() => method.setFocus("BusinessUnitID")}
          />
        </div>
      </FormColumn>
    </>
  )
}

const CustomerDependentFields = React.forwardRef(
  ({ mode, removeAllRows }, ref) => {
    const { setAccountID, setCustomerID: setContextCustomerID } = useContext(
      CustomerBranchDataContext
    )
    const [CustomerID, setCustomerID] = useState(0)

    const { data: customerSelectData } = useQuery({
      queryKey: [QUERY_KEYS.ALL_CUSTOMER_QUERY_KEY],
      queryFn: fetchAllOldCustomersForSelect,
      refetchOnWindowFocus: false,
      staleTime: 600000,
      refetchInterval: 600000,
    })

    const { data: CustomerAccounts } = useQuery({
      queryKey: [QUERY_KEYS.CUSTOMER_ACCOUNTS_QUERY_KEY, CustomerID],
      queryFn: () => fetchAllCustomerAccountsForSelect(CustomerID),
      refetchOnWindowFocus: false,
      staleTime: 600000,
      refetchInterval: 600000,
    })

    React.useImperativeHandle(ref, () => ({
      setCustomerID,
    }))

    const method = useFormContext()

    function emptyCustomerBranchesInDetailTable() {
      try {
        const detailLength =
          method.getValues("CustomerInvoiceDetail")?.length ?? 0
        for (let i = 0; i < detailLength; i++) {
          method.setValue(`CustomerInvoiceDetail.${i}.CustomerBranch`, null)
        }
      } catch (error) {
        console.error(error)
      }
    }

    const [searchParams, setSearchParams] = useSearchParams()
    const queryParams = new URLSearchParams(searchParams)
    const params_customer_id = queryParams.get("CustomerID") ?? ""
    const params_account_id = queryParams.get("AccountID") ?? ""
    const f = queryParams.get("f") ?? ""

    useEffect(() => {
      if (
        CustomerAccounts &&
        customerSelectData &&
        params_customer_id !== "" &&
        params_account_id !== ""
      ) {
        initCustomerAndAccount()
      }
    }, [params_account_id, params_customer_id, customerSelectData])

    useEffect(() => {
      if (
        CustomerID &&
        Array.isArray(CustomerAccounts) &&
        CustomerAccounts.length > 0
      ) {
        if (f == "" && params_account_id === "") {
          method.setValue("CustomerLedgers", CustomerAccounts[0].AccountID)
          setAccountID(CustomerAccounts[0].AccountID)
        }
      }
    }, [params_account_id, CustomerAccounts])

    function initCustomerAndAccount() {
      method.setValue("Customer", parseInt(decryptID(params_customer_id)))
      method.setValue("CustomerLedgers", parseInt(decryptID(params_account_id)))
      setCustomerID(decryptID(params_customer_id))
      setAccountID(decryptID(params_account_id))
      setContextCustomerID(decryptID(params_customer_id))

      setSearchParams({ f })
    }

    return (
      <>
        <FormColumn lg={4} xl={4} md={6}>
          <FormLabel>
            Customer Name
            <span className="text-red-700 fw-bold ">*</span>
            {mode !== "view" && (
              <>
                <CustomerEntryForm IconButton={true} />
              </>
            )}
          </FormLabel>

          <div>
            <CDropdown
              control={method.control}
              name={"Customer"}
              optionLabel="CustomerName"
              optionValue="CustomerID"
              placeholder="Select a customer"
              options={customerSelectData}
              disabled={mode === "view"}
              required={true}
              filter={true}
              onChange={(e) => {
                setCustomerID(e.value)
                setContextCustomerID(e.value)
                removeAllRows()
              }}
              // focusOptions={() => method.setFocus("CustomerLedgers")}
            />
          </div>
        </FormColumn>
        <FormColumn lg={4} xl={4} md={6}>
          <FormLabel>
            Customer Ledgers
            <span className="text-red-700 fw-bold ">*</span>
          </FormLabel>

          <div>
            <CDropdown
              control={method.control}
              name={`CustomerLedgers`}
              optionLabel="AccountTitle"
              optionValue="AccountID"
              placeholder="Select a ledger"
              options={CustomerAccounts}
              disabled={mode === "view"}
              required={true}
              filter={true}
              onChange={(e) => {
                setAccountID(e.value)
                emptyCustomerBranchesInDetailTable()
              }}
              focusOptions={() => method.setFocus("CustomerInvoiceMode")}
            />
          </div>
        </FormColumn>
      </>
    )
  }
)

function BusinessUnitDependantFields({ mode }) {
  const [BusinesssUnitID, setBusinessUnitID] = useState(0)

  const { data: BusinessUnitSelectData } = useQuery({
    queryKey: [QUERY_KEYS.BUSINESS_UNIT_QUERY_KEY],
    queryFn: fetchAllBusinessUnitsForSelect,
    enabled: mode !== "",
    refetchOnWindowFocus: false,
    staleTime: 600000,
    refetchInterval: 600000,
  })

  useEffect(() => {
    if (BusinessUnitSelectData?.length > 0) {
      method.setValue(
        "BusinessUnitID",
        BusinessUnitSelectData[0].BusinessUnitID
      )
      setBusinessUnitID(BusinessUnitSelectData[0].BusinessUnitID)
    }
  }, [BusinessUnitSelectData])

  useEffect(() => {
    async function fetchCustomerInvoiceNo() {
      const data = await fetchMonthlyMaxCustomerInvoiceNo(BusinesssUnitID)
      method.setValue("BusinessUnitID", BusinesssUnitID)
      method.setValue("VoucherNo", data[0]?.InvoiceNo)
      method.setValue("SessionBasedVoucherNo", data[0]?.SessionBasedVoucherNo)
    }

    if (BusinesssUnitID !== 0 && mode === "new") {
      fetchCustomerInvoiceNo()
    }
  }, [BusinesssUnitID, mode])

  const method = useFormContext()

  return (
    <>
      <FormColumn lg={3} xl={3} md={6} className="col-3">
        <FormLabel>
          Business Unit
          <span className="text-red-700 fw-bold ">*</span>
        </FormLabel>

        <div>
          <CDropdown
            control={method.control}
            name={`BusinessUnitID`}
            optionLabel="BusinessUnitName"
            optionValue="BusinessUnitID"
            placeholder="Select a business unit"
            options={BusinessUnitSelectData}
            disabled={mode === "view"}
            required={true}
            focusOptions={() => method.setFocus("Customer")}
            onChange={(e) => {
              setBusinessUnitID(e.value)
            }}
          />
        </div>
      </FormColumn>
      <FormColumn lg={2} xl={2} md={6} className="col-2">
        <FormLabel>Customer Invoice No(Monthly)</FormLabel>

        <div>
          <TextInput
            control={method.control}
            ID={"VoucherNo"}
            isEnable={false}
          />
        </div>
      </FormColumn>
      <FormColumn lg={2} xl={2} md={6} className="col-2">
        <FormLabel>Customer Invoice No(Yearly)</FormLabel>

        <div>
          <TextInput
            control={method.control}
            ID={"SessionBasedVoucherNo"}
            isEnable={false}
          />
        </div>
      </FormColumn>
      <FormColumn lg={2} xl={2} md={6} className="col-2">
        <FormLabel>Document No</FormLabel>
        <div>
          <TextInput
            control={method.control}
            ID={"DocumentNo"}
            isEnable={mode !== "view"}
          />
        </div>
      </FormColumn>
    </>
  )
}

// New Detail Header Form
function CustomerInvoiceDetailHeaderForm({ appendSingleRow }) {
  const invoiceTypeRef = useRef()
  const { pageTitles } = useAppConfigurataionProvider()

  const method = useForm({
    defaultValues: {
      InvoiceType: "Product",
      BusinessUnitID: "",
      ProductInfoID: "",
      ServiceInfoID: "",
      BalanceAmount: "",
      Amount: 0,
      Qty: 1,
      Rate: 0,
      IsFree: false,
      CGS: 0,
      Discount: 0,
      NetAmount: 0,
      DetailDescription: "",
      CustomerBranch: "",
    },
  })

  function onSubmit(data) {
    if (!data.BusinessUnitID) {
      method.setError("BusinessUnitID")
    } else if (!data.ProductInfoID) {
      method.setError("ProductInfoID")
    } else {
      appendSingleRow(data)
      method.resetField("Qty")
      method.resetField("Rate")
      method.resetField("CGS")
      method.resetField("Amount")
      method.resetField("Discount")
      method.resetField("NetAmount")
      method.resetField("DetailDescription")
    }
  }

  const typesOptions = [
    { label: `${pageTitles?.product || "Product"}`, value: "Product" },
    { label: "Service", value: "Service" },
    { label: "Software", value: "Software" },
    { label: "Hardware", value: "Hardware" },
  ]

  return (
    <>
      <form>
        <FormRow>
          <FormColumn lg={3} xl={3} md={6}>
            <FormLabel>Invoice Type</FormLabel>
            <span className="text-red-700 fw-bold ">*</span>

            <div>
              <CDropdown
                control={method.control}
                name={`InvoiceType`}
                placeholder="Select a type"
                options={typesOptions}
                required={true}
                focusOptions={() => method.setFocus("BusinessUnit")}
                onChange={(e) => {
                  invoiceTypeRef.current?.setInvoiceType(e.value)
                  if (
                    e.value === "Product" ||
                    e.value === "Software" ||
                    e.value === "Hardware"
                  ) {
                    method.resetField("ServiceInfoID")
                  }
                }}
              />
            </div>
          </FormColumn>
          <FormProvider {...method}>
            <DetailHeaderBusinessUnitDependents ref={invoiceTypeRef} />
          </FormProvider>
        </FormRow>
        <FormRow>
          <FormProvider {...method}>
            <BranchSelectField />
          </FormProvider>
          <FormColumn lg={1} xl={1} md={6}>
            <FormLabel>Qty</FormLabel>
            <NumberInput
              id={"Qty"}
              control={method.control}
              onChange={(e) => {
                const rate = method.getValues(["Rate"])
                method.setValue("Amount", e.value * rate)
                const amount = method.getValues(["Amount"])
                const discount = method.getValues(["Discount"])
                method.setValue("NetAmount", amount - discount)
              }}
              inputClassName="form-control"
              useGrouping={false}
              enterKeyOptions={() => method.setFocus("Rate")}
            />
          </FormColumn>
          <FormColumn lg={2} xl={2} md={6}>
            <FormLabel>Rate</FormLabel>
            <NumberInput
              id={"Rate"}
              control={method.control}
              onChange={(e) => {
                const qty = method.getValues(["Qty"])

                method.setValue("Amount", e.value * qty)

                const disc = method.getValues(["Discount"])

                method.setValue("NetAmount", e.value * qty - disc)
              }}
              mode="decimal"
              maxFractionDigits={2}
              inputClassName="form-control"
              useGrouping={false}
              disabled={method.watch("IsFree")}
              enterKeyOptions={() => method.setFocus("CGS")}
            />
          </FormColumn>
          <FormColumn lg={1} xl={1} md={6}>
            <FormLabel>CGS</FormLabel>
            <NumberInput
              id={"CGS"}
              control={method.control}
              mode="decimal"
              maxFractionDigits={2}
              inputClassName="form-control"
              useGrouping={false}
              enterKeyOptions={() => method.setFocus("Discount")}
            />
          </FormColumn>
          <FormColumn lg={2} xl={2} md={6}>
            <FormLabel>Amount</FormLabel>
            <NumberInput
              id={"Amount"}
              control={method.control}
              mode="decimal"
              maxFractionDigits={2}
              inputClassName="form-control"
              useGrouping={false}
              disabled={true}
            />
          </FormColumn>
          <FormColumn lg={1} xl={1} md={6}>
            <FormLabel>Discount</FormLabel>
            <NumberInput
              id={"Discount"}
              control={method.control}
              onChange={(e) => {
                const amount = method.getValues(["Amount"])
                method.setValue("NetAmount", amount - e.value)
              }}
              mode="decimal"
              maxFractionDigits={2}
              inputClassName="form-control"
              useGrouping={false}
              disabled={method.watch("IsFree")}
              enterKeyOptions={() => method.setFocus("DetailDescription")}
            />
          </FormColumn>
          <FormColumn lg={2} xl={2} md={6}>
            <FormLabel>Net Amount</FormLabel>
            <NumberInput
              id={"NetAmount"}
              control={method.control}
              mode="decimal"
              maxFractionDigits={2}
              inputClassName="form-control"
              useGrouping={false}
              disabled={true}
            />
          </FormColumn>
        </FormRow>
        <FormRow>
          <FormColumn lg={9} xl={9} md={12}>
            <FormLabel>Description</FormLabel>
            <TextAreaField
              control={method.control}
              name={"DetailDescription"}
            />
          </FormColumn>
          <FormColumn lg={1} xl={1} md={6}>
            <FormLabel>Is Free</FormLabel>
            <div>
              <CSwitchInput
                control={method.control}
                name={"IsFree"}
                onChange={(e) => {
                  if (e.value) {
                    method.setValue("Rate", 0)
                    method.setValue("Amount", 0)
                    method.setValue("Discount", 0)
                    method.setValue("NetAmount", 0)
                  }
                }}
              />
            </div>
          </FormColumn>

          <FormColumn lg={2} xl={2} md={6}>
            <FormLabel></FormLabel>
            <DetailHeaderActionButtons
              handleAdd={() => method.handleSubmit(onSubmit)()}
              handleClear={() => method.reset()}
            />
          </FormColumn>
        </FormRow>
      </form>
    </>
  )
}

const DetailHeaderBusinessUnitDependents = React.forwardRef((props, ref) => {
  const [InvoiceType, setInvoiceType] = useState("Product")
  const [BusinessUnitID, setBusinessUnitID] = useState(0)
  const { CustomerID } = useContext(CustomerBranchDataContext)

  const { user } = useAuthProvider()

  const { pageTitles } = useAppConfigurataionProvider()

  const { data: MostSaledCustomerProduct } = useQuery({
    queryKey: ["mostSaledProducts", CustomerID],
    queryFn: () =>
      GetCustomerProduct({
        LoginUserID: user?.userID,
        CustomerID: CustomerID,
      }),
    refetchOnWindowFocus: true,
    staleTime: 600000,
    refetchInterval: 600000,
  })
  const { data: BusinessUnitSelectData } = useQuery({
    queryKey: [SELECT_QUERY_KEYS.BUSINESS_UNIT_SELECT_QUERY_KEY],
    queryFn: fetchAllBusinessUnitsForSelect,
    refetchOnWindowFocus: true,
    staleTime: 600000,
    refetchInterval: 600000,
  })
  const { data: ProductsInfoSelectData } = useQuery({
    queryKey: [
      SELECT_QUERY_KEYS.PRODUCTS_INFO_SELECT_QUERY_KEY,
      BusinessUnitID,
    ],
    queryFn: () => fetchAllProductsForSelect(BusinessUnitID),
    refetchOnWindowFocus: true,
  })
  const { data: ServicesInfoSelectData } = useQuery({
    queryKey: [SELECT_QUERY_KEYS.SERVICES_SELECT_QUERY_KEY, BusinessUnitID],
    queryFn: () => fetchAllServicesForSelect(BusinessUnitID),
    refetchOnWindowFocus: true,
  })

  React.useImperativeHandle(ref, () => ({
    setInvoiceType,
  }))

  const method = useFormContext()

  useEffect(() => {
    if (
      MostSaledCustomerProduct &&
      Array.isArray(MostSaledCustomerProduct) &&
      MostSaledCustomerProduct.length > 0
    ) {
      method.setValue(
        "BusinessUnitID",
        MostSaledCustomerProduct[0].BusinessUnitID
      )
      method.setValue(
        "ProductInfoID",
        MostSaledCustomerProduct[0].ProductToInvoiceID
      )
      setBusinessUnitID(MostSaledCustomerProduct[0].BusinessUnitID)
    } else {
      method.setValue("BusinessUnitID", 0)
      method.setValue("ProductInfoID", 0)
      setBusinessUnitID(0)
    }
  }, [MostSaledCustomerProduct])

  return (
    <>
      <FormColumn lg={3} xl={3} md={6} className="col-3">
        <FormLabel>
          Business Unit
          <span className="text-red-700 fw-bold ">*</span>
        </FormLabel>

        <div>
          <CDropdown
            control={method.control}
            name={`BusinessUnitID`}
            optionLabel="BusinessUnitName"
            optionValue="BusinessUnitID"
            placeholder="Select a business unit"
            options={BusinessUnitSelectData}
            required
            focusOptions={() => method.setFocus("Customer")}
            onChange={(e) => {
              setBusinessUnitID(e.value)
              method.resetField("ProductInfoID")
              method.resetField("ServiceInfoID")
            }}
          />
        </div>
      </FormColumn>
      <FormColumn lg={3} xl={3} md={6} className="col-3">
        <FormLabel>
          {pageTitles?.product || "Product"}
          <span className="text-red-700 fw-bold ">*</span>

          {/* <ProductInfoDialog /> */}
        </FormLabel>
        <div>
          <CDropdown
            control={method.control}
            name={`ProductInfoID`}
            optionLabel="ProductInfoTitle"
            optionValue="ProductInfoID"
            placeholder={`Select a ${
              pageTitles?.product?.toLowerCase() ?? "product"
            }`}
            options={ProductsInfoSelectData}
            required
            filter={true}
            focusOptions={() => method.setFocus("ServiceInfo")}
          />
        </div>
      </FormColumn>
      <FormColumn lg={3} xl={3} md={6} className="col-3">
        <FormLabel>
          {InvoiceType === "Product"
            ? `${pageTitles?.product || "Product"} to Invoice`
            : "Service to Invoice"}{" "}
        </FormLabel>

        <div>
          <CDropdown
            control={method.control}
            name={`ServiceInfoID`}
            optionLabel="ProductInfoTitle"
            optionValue="ProductInfoID"
            placeholder={`Select a service`}
            options={ServicesInfoSelectData}
            filter={true}
            disabled={
              InvoiceType === "Product" ||
              InvoiceType === "Software" ||
              InvoiceType === "Hardware"
            }
            required={InvoiceType == "Service"}
            focusOptions={() => method.setFocus("Qty")}
          />
        </div>
      </FormColumn>
    </>
  )
})

const CustomerInvoiceDetailTable = React.forwardRef(
  ({ mode, BusinessUnitSelectData }, ref) => {
    const method = useFormContext()

    const { fields, append, remove } = useFieldArray({
      control: method.control,
      name: "CustomerInvoiceDetail",
      rules: {
        required: true,
      },
    })

    React.useImperativeHandle(ref, () => ({
      appendSingleRow(data) {
        append(data)
      },
      removeAllRows() {
        remove()
      },
    }))

    const { pageTitles } = useAppConfigurataionProvider()

    const typesOptions = [
      { label: `${pageTitles?.product || "Product"}`, value: "Product" },
      { label: "Service", value: "Service" },
      { label: "Software", value: "Software" },
      { label: "Hardware", value: "Hardware" },
    ]
    return (
      <>
        <div className="overflow-x-auto">
          <table
            className="table table-responsive mt-2 "
            style={{ width: "1500px" }}
          >
            <thead>
              <DetailTableHeadings pageTitles={pageTitles} />
            </thead>
            <tbody>
              <FormProvider {...method}>
                {fields.map((item, index) => {
                  return (
                    <CustomerInvoiceDetailTableRow
                      key={item.id}
                      item={item}
                      index={index}
                      disable={mode === "view"}
                      BusinessUnitSelectData={BusinessUnitSelectData}
                      remove={remove}
                      typesOptions={typesOptions}
                      pageTitles={pageTitles}
                    />
                  )
                })}
              </FormProvider>
            </tbody>
          </table>
        </div>
      </>
    )
  }
)

function CustomerInvoiceDetailTableRow({
  item,
  index,
  disable = false,
  BusinessUnitSelectData,
  remove,
  typesOptions,
  pageTitles,
}) {
  const method = useFormContext()

  return (
    <FormProvider {...method}>
      <CustomerInvoiceDetailTableRowComponent
        index={index}
        item={item}
        BusinessUnitSelectData={BusinessUnitSelectData}
        typesOptions={typesOptions}
        disable={disable}
        pageTitles={pageTitles}
        remove={remove}
      />
    </FormProvider>
  )
}

// Total
function CustomerInvoiceDetailTotal() {
  const method = useFormContext()

  const details = useWatch({
    control: method.control,
    name: "CustomerInvoiceDetail",
  })

  useEffect(() => {
    calculateTotal(details)
  }, [details])

  function calculateTotal(details) {
    let rateSum = 0
    let cgsSum = 0
    let discountSum = 0
    let amountSum = 0

    details.forEach((item, index) => {
      const rate = parseFloat(item.Rate || 0)
      const cgs = parseFloat(item.CGS || 0)
      const discount = parseFloat(item.Discount || 0)
      const amount = parseFloat(item.NetAmount || 0)
      const qty = parseFloat(item.Qty || 0)

      rateSum += rate * qty
      cgsSum += cgs
      discountSum += discount
      amountSum += amount
    })
    method.setValue("TotalNetAmount", amountSum)
    method.setValue("TotalDiscount", discountSum)
    method.setValue("TotalAmount", cgsSum)
    method.setValue("TotalRate", rateSum)
  }

  return null
}

const BranchSelectField = () => {
  const { AccountID } = useContext(CustomerBranchDataContext)

  const method = useFormContext()
  const { pageTitles } = useAppConfigurataionProvider()

  const { data } = useQuery({
    queryKey: [SELECT_QUERY_KEYS.CUSTOMER_BRANCHES_SELECT_QUERY_KEY, AccountID],
    queryFn: () => fetchAllCustomerBranchesData(AccountID),
    enabled: AccountID !== 0,
    initialData: [],
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      method.setValue("CustomerBranch", data[0].BranchID)
    }
  }, [data])

  return (
    <>
      <FormColumn lg={3} xl={3} md={6} className="col-3">
        <FormLabel>
          {pageTitles?.branch || "Customer Branch"}
          <span className="text-red-700 fw-bold ">*</span>
        </FormLabel>

        <div>
          <CDropdown
            control={method.control}
            name={`CustomerBranch`}
            optionLabel="BranchTitle"
            optionValue="BranchID"
            placeholder={`Select a  ${
              pageTitles?.branch?.toLowerCase() ?? "branch"
            }`}
            options={data}
            required={true}
            focusOptions={() => method.setFocus("ProductInfo")}
          />
        </div>
      </FormColumn>
    </>
  )
}
export const CustomerBranchDataContext = createContext()

const CustomerBranchDataProvider = ({ children }) => {
  const [AccountID, setAccountID] = useState(0)
  const [CustomerID, setCustomerID] = useState(0)

  return (
    <CustomerBranchDataContext.Provider
      value={{ setAccountID, AccountID, CustomerID, setCustomerID }}
    >
      {children}
    </CustomerBranchDataContext.Provider>
  )
}

const NullBranchContext = React.forwardRef((_, ref) => {
  const { setAccountID } = useContext(CustomerBranchDataContext)
  React.useImperativeHandle(ref, () => ({
    setAccountID,
  }))

  return null
})

const DetailTableHeadings = ({ pageTitles }) => {
  return (
    <tr>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        Sr No.
      </th>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        Is Free
      </th>
      <th
        className="p-2 text-white"
        style={{ background: onlineDetailColor, width: "300px" }}
      >
        Invoice Type
      </th>

      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        {pageTitles?.branch || "Customer Branch"}
      </th>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        Business Unit
      </th>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        {pageTitles?.product || "Product"}
      </th>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        Service
      </th>
      <th className="p-2 text-white" style={{ background: onlineDetailColor }}>
        Qty
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Rate
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        CGS
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Amount
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Discount
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Net Amount
      </th>
      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Description
      </th>

      <th className="p-2  text-white" style={{ background: onlineDetailColor }}>
        Actions
      </th>
    </tr>
  )
}
