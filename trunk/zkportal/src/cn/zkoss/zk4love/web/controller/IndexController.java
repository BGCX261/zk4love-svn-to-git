package cn.zkoss.zk4love.web.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Properties;

import org.zkoss.zk.ui.Component;
import org.zkoss.zk.ui.util.GenericForwardComposer;

import com.sun4love.commons.web.zk.ZkUtils;

public class IndexController extends GenericForwardComposer {
	private static final long serialVersionUID = 958938579523480947L;

	@Override
	public void doBeforeComposeChildren(Component comp) throws Exception {
		super.doBeforeComposeChildren(comp);
		loadPages();
	}

	public void loadPages() throws FileNotFoundException, IOException {
		File pagesConfig = new File(ZkUtils.getRealPath("pages.properties"));
		Properties props = new Properties();
		ZkUtils.setExecutionAttribute("pages", props);
		props.load(new InputStreamReader(new FileInputStream(pagesConfig),
				"utf-8"));
	}

}
