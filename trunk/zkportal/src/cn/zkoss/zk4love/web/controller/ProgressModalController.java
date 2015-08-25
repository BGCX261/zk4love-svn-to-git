package cn.zkoss.zk4love.web.controller;

import org.zkoss.zk.ui.util.GenericForwardComposer;

public class ProgressModalController extends GenericForwardComposer {
	private static final long serialVersionUID = 8682159502663509531L;

	public void onProgressModal() {
		try {
			Thread.sleep(6 * 1000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}

}
