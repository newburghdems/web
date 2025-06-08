module Jekyll
  module I18nFilters
    def localize_url(path)
      lang = @context.registers[:page]['lang']
      if lang && lang != 'en'
        "/#{lang}/#{path}"
      else
        "/#{path}"
      end
    end
  end
end

Liquid::Template.register_filter(Jekyll::I18nFilters)
