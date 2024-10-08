import axios from "axios"
import { format, parseISO } from "date-fns"
import { decryptID, encryptID } from "../utils/crypto"
import {
  ShowErrorToast,
  ShowSuccessToast,
  formatDateWithSymbol,
} from "../utils/CommonFunctions"

const apiUrl = import.meta.env.VITE_APP_API_URL

const CONTROLLER = "CustomerInvoice"
const WHEREMETHOD = "GetCustomerInvoiceWhere"
const DELETEMETHOD = "CustomerInvoiceDelete"

// URL: /CustomerInvoice/GetCustomerInvoicesData?LoginUserID=??
export async function fetchAllCustomerInvoices(LoginUserID) {
  const { data } = await axios.post(
    `${apiUrl}/${CONTROLLER}/GetCustomerInvoicesData?LoginUserID=${LoginUserID}`
  )
  let newData = data.data.map((item) => {
    return {
      CustomerInvoiceID: item.CustomerInvoiceID,
      InvoiceNo: item.InvoiceNo,
      SessionBasedVoucherNo: item.SessionBasedVoucherNo,
      InvoiceTitle: item.InvoiceTitle,
      CustomerName: item.CustomerName,
      AccountTitle: item.AccountTitle,
      InvoiceDate: format(parseISO(item.InvoiceDate), "dd-MMM-yyyy"),
      TotalNetAmount: item.TotalNetAmount,
      DocumentNo: item.DocumentNo,
    }
  })
  return newData ?? []
}

// URL: /EduIMS/GetCustomerInvoiceWhere?CustomerInvoiceID=??&LoginUserID=??
export async function fetchCustomerInvoiceById(CustomerInvoiceID, LoginUserID) {
  try {
    CustomerInvoiceID = decryptID(CustomerInvoiceID)

    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/${WHEREMETHOD}?CustomerInvoiceID=${CustomerInvoiceID}&LoginUserID=${LoginUserID}`
    )
    return data
  } catch (e) {
    ShowErrorToast(e.message)
  }
}

export async function fetchMaxInvoiceNo(LoginUserID) {
  try {
    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/GetInvoiceNo?LoginUserID=${LoginUserID}`
    )
    return data
  } catch (error) {
    ShowErrorToast(error)
  }
}
export async function fetchMaxSessionBasedVoucherNo(LoginUserID) {
  try {
    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/GetSessionBasedInvoiceNo?LoginUserID=${LoginUserID}`
    )
    return data
  } catch (error) {
    ShowErrorToast("Fetch::" + error.message)
  }
}
// URL: /CustomerInvoice/CustomerInvoiceDelete?CustomerInvoiceID=??&LoginUserID=??
export async function deleteCustomerInvoiceByID({
  CustomerInvoiceID,
  LoginUserID,
}) {
  try {
    CustomerInvoiceID = decryptID(CustomerInvoiceID)
    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/${DELETEMETHOD}?CustomerInvoiceID=${CustomerInvoiceID}&LoginUserID=${LoginUserID}`
    )

    if (data.success === true) {
      ShowSuccessToast("Invoice sucessfully deleted!")
      return true
    } else {
      ShowErrorToast(data.message)
      return false
    }
  } catch (e) {
    ShowErrorToast("Delete::" + e.message)
  }
}

export async function addNewCustomerInvoice({
  formData,
  userID,
  CustomerInvoiceID = 0,
}) {
  try {
    // let InvoiceDetail = formData?.CustomerInvoiceDetail?.map((item, index) => {

    //   return {
    //     RowID: index + 1,
    //     InvoiceType: item.InvoiceType,
    //     BusinessUnitID: item.BusinessUnitID,
    //     BranchID: item.CustomerBranch,
    //     ProductToInvoiceID: item.ProductInfoID,
    //     ServiceToInvoiceID:
    //       item.ServiceInfoID === undefined ? null : item.ServiceInfoID,
    //     Quantity: item.Qty,
    //     Rate: item.Rate,
    //     CGS: item.CGS,
    //     Amount: item.Amount,
    //     Discount: item.Discount,
    //     NetAmount: item.NetAmount,
    //     DetailDescription: item.DetailDescription,
    //     IsFree: item.IsFree ? 1 : 0,
    //   }
    // })
    let InvoiceDetail = []
    let valid = true
    for (let i = 0; i < formData.CustomerInvoiceDetail.length; i++) {
      const item = formData.CustomerInvoiceDetail[i]

      if (item.ProductInfoID == 0 || item.ProductInfoID == "") {
        valid = false
        break
      }

      if (item.BusinessUnitID == 0 || item.BusinessUnitID == "") {
        valid = false
        break
      }

      InvoiceDetail.push({
        RowID: i + 1,
        InvoiceType: item.InvoiceType,
        BusinessUnitID: item.BusinessUnitID,
        BranchID: item.CustomerBranch,
        ProductToInvoiceID: item.ProductInfoID,
        ServiceToInvoiceID:
          item.ServiceInfoID === undefined ? null : item.ServiceInfoID,
        Quantity: item.Qty,
        Rate: item.Rate,
        CGS: item.CGS,
        Amount: item.Amount,
        Discount: item.Discount,
        NetAmount: item.NetAmount,
        DetailDescription: item.DetailDescription,
        IsFree: item.IsFree ? 1 : 0,
      })
    }

    if (valid == true) {
      let InstallmentDetail = []
      if (formData?.installments.length > 0) {
        InstallmentDetail = formData?.installments
          ?.map((item, index) => {
            if (parseFloat(item.Amount || "0") == 0) {
              return null
            }
            return {
              InstallmentRowID: index + 1,
              InstallmentDueDate: formatDateWithSymbol(
                item.IDate ?? new Date()
              ),
              InstallmentAmount: parseFloat(item.Amount),
            }
          })
          .filter((item) => item != null)
      }

      let DataToSend = {
        SessionID: formData?.SessionID,
        InvoiceNo: formData?.VoucherNo,
        SessionBasedVoucherNo: formData?.SessionBasedVoucherNo,
        InvoiceDate:
          formatDateWithSymbol(formData?.VoucherDate) ||
          formatDateWithSymbol(new Date()),
        InvoiceDueDate:
          formatDateWithSymbol(formData?.VoucherDueDate) ||
          formatDateWithSymbol(new Date()),
        CustomerID: formData?.Customer,
        AccountID: formData?.CustomerLedgers,
        BusinessUnitID: formData?.BusinessUnitID,
        InvoiceTitle: formData?.InvoiceTitle,
        Description: formData?.Description,
        TotalRate: formData?.TotalRate,
        TotalCGS: formData?.TotalAmount,
        TotalDiscount: formData?.TotalDiscount,
        TotalNetAmount: formData?.TotalNetAmount,
        DocumentNo: formData?.DocumentNo,
        EntryUserID: userID,
        InvoiceDetail: JSON.stringify(InvoiceDetail),
      }

      if (InstallmentDetail.length > 0) {
        DataToSend.InvoiceInstallmentDetail = JSON.stringify(InstallmentDetail)
      }

      CustomerInvoiceID =
        CustomerInvoiceID === 0 ? 0 : decryptID(CustomerInvoiceID)

      if (CustomerInvoiceID !== 0 || CustomerInvoiceID !== undefined) {
        DataToSend.CustomerInvoiceID = CustomerInvoiceID
      } else {
        DataToSend.CustomerInvoiceID = 0
      }

      const { data } = await axios.post(
        apiUrl + `/CustomerInvoice/CustomerInvoiceInsertUpdate`,
        DataToSend
      )

      if (data.success === true) {
        if (CustomerInvoiceID !== 0) {
          ShowSuccessToast("Invoice updated successfully!")
        } else {
          ShowSuccessToast("Invoice created successfully!")
        }
        return {
          success: true,
          RecordID: encryptID(data?.CustomerInvoiceID),
          Type: data?.Type,
        }
      } else {
        ShowErrorToast(data.message)
        return { success: false, RecordID: CustomerInvoiceID, Type: "" }
      }
    } else {
      ShowErrorToast("Please select complete data in detail row!")
      return { success: false, RecordID: CustomerInvoiceID, Type: "" }
    }
  } catch (e) {
    ShowErrorToast("Insert::" + e.message)
  }
}
export async function fetchMonthlyMaxCustomerInvoiceNo(BusinessUnitID) {
  if (BusinessUnitID !== 0) {
    try {
      const { data } = await axios.post(
        `${apiUrl}/${CONTROLLER}/GetInvoiceNo?BusinessUnitID=${BusinessUnitID}`
      )
      return data.data
    } catch (error) {
      ShowErrorToast(error.message)
    }
  } else {
    return []
  }
}

export async function SendCustomerInvoiceEmail({
  LoginUserID,
  Type,
  CustomerInvoiceID,
}) {
  try {
    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/SendCustomerInvoiceEmail?CustomerInvoiceID=${CustomerInvoiceID}&Type=${Type}&LoginUserID=${LoginUserID}`
    )

    if (data.success === true) {
      return true
    } else {
      ShowErrorToast(data.message)
      return false
    }
  } catch (error) {
    ShowErrorToast(error.message)
  }
}

export async function SendCustomerInvoiceWAMsg({
  LoginUserID,
  Type,
  CustomerInvoiceID,
}) {
  try {
    const { data } = await axios.post(
      `${apiUrl}/${CONTROLLER}/SendInvoiceWAMessage?CustomerInvoiceID=${CustomerInvoiceID}&Type=${Type}&LoginUserID=${LoginUserID}`
    )

    if (data.success === true) {
      return true
    } else {
      return true
    }
  } catch (error) {
    ShowErrorToast(error.message)
  }
}

export async function GetCustomerProduct({ LoginUserID, CustomerID }) {
  try {
    const { data } = await axios.post(
      `${apiUrl}/Common/GetCustomerProduct?CustomerID=${CustomerID}&LoginUserID=${LoginUserID}`
    )

    if (data.success === true) {
      return data.data
    } else {
      return []
    }
  } catch (error) {
    ShowErrorToast(error.message)
    return []
  }
}
