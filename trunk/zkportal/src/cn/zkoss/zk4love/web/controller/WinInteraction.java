package cn.zkoss.zk4love.web.controller;

import org.zkoss.zk.ui.SuspendNotAllowedException;
import org.zkoss.zk.ui.util.GenericForwardComposer;
import org.zkoss.zul.Window;
import org.zkoss.zul.api.Textbox;

import com.sun4love.commons.web.zk.ZkUtils;

public class WinInteraction extends GenericForwardComposer {
	private static final long serialVersionUID = 33664316822356345L;
	private Textbox txtCustomer;

	public void onShowPopup() {
		Window popupWin = (Window) ZkUtils.createComponents(
				"winInteraction-popup.zul", self, null);
		popupWin.setAttribute("txtCustomer", txtCustomer);
		try {
			popupWin.doModal();
		} catch (SuspendNotAllowedException e) {
			// ignore
		} catch (InterruptedException e) {
			// ignore
		}
	}

}
