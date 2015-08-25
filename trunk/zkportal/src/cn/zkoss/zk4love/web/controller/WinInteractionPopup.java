package cn.zkoss.zk4love.web.controller;

import org.zkoss.zk.ui.event.ForwardEvent;
import org.zkoss.zul.Window;
import org.zkoss.zul.api.Label;
import org.zkoss.zul.api.Row;
import org.zkoss.zul.api.Textbox;

public class WinInteractionPopup extends Window {
	private static final long serialVersionUID = 33664316822356345L;
	public void onConfirm(ForwardEvent event) {
		Row row = (Row) event.getOrigin().getTarget();
		Label lblCustomer = (Label) row.getFirstChild().getFirstChild();
		Textbox txtCustomer = (Textbox) this.getAttribute("txtCustomer");
		txtCustomer.setText(lblCustomer.getValue().trim());
		this.setVisible(false);
		this.detach();
	}
}
