task :gen do
  File.open("widget.template.html") do |file|
    # javascript template
    js_template = File.open("widget.template.js") { |fs| fs.read }
    # lines to substitute into template
    lines = file.readlines.map { |val| "'#{val.strip}'" }.join(" + \n")
    # substituted template
    js_template = js_template.gsub(/\{WIDGET_LINES\}/, "\ntemplate = #{lines};")
    
    # write out actual .js
    File.open("widget.js", "w") do |out|
      out.write(js_template)
    end
  end
end
